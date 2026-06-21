import Booking from '../models/Booking.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import SmartAccessGrant from '../models/SmartAccessGrant.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { sendSmartLockAccessEmail } from '../services/emailService.js';
import SmartLockService from '../services/smartLockService.js';
import { buildGuestLockIdentity, buildLockIdentityReference } from '../services/smartLockIdentityService.js';

const isValidBookingId = (bookingId) => mongoose.Types.ObjectId.isValid(bookingId);

/**
 * Generate a unique access token for a booking
 */
export const generateAccessToken = (bookingId) => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate a random backup PIN (4-6 digits)
 */
export const generateBackupPin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Generate QR code for unlock URL
 */
export const generateQRCode = async (unlockUrl) => {
  try {
    const qrCode = await QRCode.toDataURL(unlockUrl);
    return qrCode;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

export const provisionSmartLockAccessForBooking = async ({
  bookingId,
  hotelId,
  sendEmail = true,
  setupDevice = false
}) => {
  if (!isValidBookingId(bookingId)) {
    const error = new Error('Invalid booking ID');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'room',
      populate: [
        { path: 'smartLockDevice', select: 'deviceId tuyaDeviceId ttlockDeviceId status roomNumber name' },
        { path: 'doorSensorDevice', select: 'deviceId tuyaDeviceId ttlockDeviceId status' }
      ]
    })
    .populate('guest')
    .populate('hotel');

  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== 'confirmed') {
    const error = new Error('Booking must be confirmed before creating smart lock access');
    error.statusCode = 400;
    throw error;
  }

  if (hotelId && booking.hotel?._id?.toString() !== hotelId) {
    const error = new Error('Booking does not belong to this hotel');
    error.statusCode = 403;
    throw error;
  }

  if (booking.hotel?.contactlessCheckInEnabled !== true) {
    const error = new Error('Contactless check-in is not enabled for this hotel');
    error.statusCode = 400;
    throw error;
  }

  if (!booking.room?.smartLockDevice) {
    const error = new Error('This room is not contactless-ready. A smart lock must be assigned first.');
    error.statusCode = 400;
    throw error;
  }

  const accessToken = generateAccessToken(bookingId);
  const provisionalBackupPin = generateBackupPin();
  const guestIdentity = buildGuestLockIdentity({ guest: booking.guest, booking });
  const smartLockDevice = booking.room.smartLockDevice;
  const smartLockTarget = smartLockDevice?.tuyaDeviceId || smartLockDevice?.ttlockDeviceId || smartLockDevice?.deviceId;
  let tuyaIdentityRef = buildLockIdentityReference(guestIdentity);
  const unlockUrl = `${process.env.FRONTEND_URL || 'https://www.smarttrackbookings.live'}/unlock?token=${accessToken}`;
  const qrCode = await generateQRCode(unlockUrl);

  if (smartLockTarget) {
    try {
      const ensuredUser = await SmartLockService.ensureDeviceUser(smartLockTarget, guestIdentity);
      tuyaIdentityRef = buildLockIdentityReference(guestIdentity, {
        tuyaUserId: tuyaIdentityRef.provider === 'tuya' ? ensuredUser.userId : null,
        ttlockUserId: tuyaIdentityRef.provider === 'ttlock' ? ensuredUser.userId : null,
        syncState: ensuredUser.created ? 'created' : 'linked',
        lastSyncedAt: new Date()
      });
    } catch (identityError) {
      console.warn('⚠️ Failed to ensure Tuya device user for guest booking:', booking.bookingNumber, identityError.message);
      tuyaIdentityRef = buildLockIdentityReference(guestIdentity, {
        syncState: 'error'
      });
    }
  }

  booking.smartLockAccess = {
    accessToken,
    backupPin: provisionalBackupPin,
    qrCode,
    expiresAt: booking.checkOutDate,
    enabled: true,
    unlockAttempts: [],
    tuyaIdentity: tuyaIdentityRef
  };

  await booking.save();

  let deviceSetup = false;
  let deviceProvisionResult = null;
  if (setupDevice && smartLockTarget) {
    try {
      const expiresIn = Math.max(0, Math.floor((new Date(booking.checkOutDate).getTime() - Date.now()) / 1000));
      deviceProvisionResult = await SmartLockService.addTemporaryAccess(
        smartLockTarget,
        booking.guest?.name || 'Guest',
        provisionalBackupPin,
        expiresIn
      );
      deviceSetup = true;
      console.log('✅ Temporary device access created:', smartLockTarget);
    } catch (deviceError) {
      console.warn('⚠️ Failed to set up device access:', deviceError.message);
    }
  }

  booking.smartLockAccess.tuyaIdentity = {
    ...tuyaIdentityRef,
    pendingPasswordId: deviceProvisionResult?.result?.offline_temp_password_id || deviceProvisionResult?.result?.id || null
  };
  if (deviceProvisionResult?.accessCode) {
    booking.smartLockAccess.backupPin = deviceProvisionResult.accessCode;
  }
  await booking.save();

  const guestAccessCode = deviceProvisionResult?.accessCode || provisionalBackupPin;
  await SmartAccessGrant.findOneAndUpdate(
    { booking: booking._id, subjectType: 'guest', status: 'active' },
    {
      hotel: booking.hotel._id,
      room: booking.room._id,
      device: smartLockDevice._id,
      booking: booking._id,
      subjectType: 'guest',
      subjectUser: booking.guest?._id || null,
      grantType: 'contactless-checkin',
      accessCode: guestAccessCode,
      accessToken,
      validFrom: booking.checkInDate,
      validUntil: booking.checkOutDate,
      status: 'active',
      metadata: {
        roomAccessMode: booking.room.accessMode || 'smart_lock',
        tuyaIdentity: {
          ...tuyaIdentityRef,
          pendingPasswordId: deviceProvisionResult?.result?.offline_temp_password_id || deviceProvisionResult?.result?.id || null
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let emailResult = null;
  if (sendEmail && booking.guest?.email) {
    try {
      emailResult = await sendSmartLockAccessEmail(booking.guest.email, {
        guestName: booking.guest.name || 'Guest',
        hotelName: booking.hotel?.name || 'Our Hotel',
        roomNumber: booking.room?.roomNumber || booking.room?.number || booking.room?.name || 'TBD',
        accessToken,
        backupPin: guestAccessCode,
        qrCodeUrl: qrCode,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        unlockPageUrl: unlockUrl
      });
      console.log('✅ Smart lock access email sent to:', booking.guest.email);
    } catch (emailError) {
      console.warn('⚠️ Failed to send email:', emailError.message);
    }
  }

  return {
    booking,
    data: {
      accessToken,
      backupPin: guestAccessCode,
      qrCode,
      unlockUrl,
      expiresAt: booking.checkOutDate,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guest?.name || 'Guest',
      guestEmail: booking.guest?.email,
      roomNumber: booking.room?.roomNumber || booking.room?.number || booking.room?.name,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      emailSent: !!emailResult?.success,
      deviceSetup
    }
  };
};

export const revokeSmartLockAccessForBooking = async (bookingId) => {
  if (!isValidBookingId(bookingId)) {
    const error = new Error('Invalid booking ID');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'room',
      populate: { path: 'smartLockDevice', select: 'deviceId tuyaDeviceId ttlockDeviceId status' }
    });

  if (!booking) {
    return null;
  }

  if (booking.smartLockAccess) {
    booking.smartLockAccess.enabled = false;
    await booking.save();
  }

  const activeGrant = await SmartAccessGrant.findOne({
    booking: booking._id,
    subjectType: 'guest',
    status: 'active'
  }).populate('device', 'deviceId tuyaDeviceId ttlockDeviceId');

  if (activeGrant) {
    const smartLockTarget = activeGrant.device?.tuyaDeviceId || activeGrant.device?.ttlockDeviceId || activeGrant.device?.deviceId;
    if (smartLockTarget && activeGrant.accessCode) {
      try {
        await SmartLockService.removeTemporaryAccess(smartLockTarget, activeGrant.accessCode);
      } catch (error) {
        console.warn('⚠️ Failed to remove temporary device access:', error.message);
      }
    }
    activeGrant.status = 'revoked';
    activeGrant.revokedAt = new Date();
    await activeGrant.save();
  }

  return booking;
};

/**
 * Create smart lock access for a booking
 * POST /smart-lock/create-access/:bookingId
 */
export const createSmartLockAccess = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { hotelId, sendEmail = true, setupDevice = false } = req.body;
    const result = await provisionSmartLockAccessForBooking({
      bookingId,
      hotelId,
      sendEmail,
      setupDevice
    });

    return res.status(200).json({
      status: 'success',
      message: 'Smart lock access created',
      data: result.data
    });
  } catch (error) {
    console.error('Error creating smart lock access:', error);
    return res.status(error.statusCode || 500).json({
      status: error.statusCode ? 'failed' : 'error',
      message: 'Failed to create smart lock access',
      error: error.message
    });
  }
};

/**
 * Unlock room using access token
 * POST /smart-lock/unlock
 */
export const unlockRoom = async (req, res) => {
  try {
    const { accessToken, method = 'token' } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        status: 'failed',
        message: 'Access token is required'
      });
    }

    // Find booking by access token
    const booking = await Booking.findOne({
      'smartLockAccess.accessToken': accessToken
    })
      .populate({
        path: 'room',
        populate: { path: 'smartLockDevice', select: 'deviceId tuyaDeviceId ttlockDeviceId status' }
      })
      .populate('hotel');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Invalid access token'
      });
    }

    // Check if smart lock access is enabled
    if (!booking.smartLockAccess?.enabled) {
      return res.status(400).json({
        status: 'failed',
        message: 'Smart lock access is not enabled for this booking'
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(booking.smartLockAccess.expiresAt);

    if (now > expiresAt) {
      return res.status(400).json({
        status: 'failed',
        message: 'Access token has expired',
        expiryDate: expiresAt
      });
    }

    // Check if booking is checked-in or confirmed
    if (!['confirmed', 'checked-in'].includes(booking.status)) {
      return res.status(400).json({
        status: 'failed',
        message: `Cannot unlock room. Booking status is ${booking.status}`
      });
    }

    const smartLockTarget = booking.room?.smartLockDevice?.tuyaDeviceId
      || booking.room?.smartLockDevice?.ttlockDeviceId
      || booking.room?.smartLockDevice?.deviceId
      || booking.room?.smartLockId;

    const remoteUnlockSupport = smartLockTarget
      ? await SmartLockService.supportsRemoteUnlock(smartLockTarget).catch(() => ({
        supported: false,
        codes: []
      }))
      : { supported: false, codes: [] };

    if (!remoteUnlockSupport.supported) {
      return res.status(400).json({
        status: 'failed',
        message: 'Phone unlock is not supported for this lock. Use the 10-digit door PIN on the keypad instead.',
        data: {
          roomNumber: booking.room?.number || booking.room?.name || booking.room?.roomNumber,
          bookingNumber: booking.bookingNumber,
          backupPin: booking.smartLockAccess?.backupPin || null,
          mobileUnlockSupported: false
        }
      });
    }

    // Prepare unlock attempt log
    const unlockAttempt = {
      timestamp: new Date(),
      success: false,
      deviceId: smartLockTarget || null
    };

    // TODO: Call Tuya API to unlock the smart lock device
    // For now, we'll simulate successful unlock
    const unlockSuccess = await unlockSmartLockDevice(
      booking.hotel?._id,
      smartLockTarget
    );

    const diagnostics = await collectUnlockDiagnostics(smartLockTarget);

    if (unlockSuccess) {
      unlockAttempt.success = true;
      booking.smartLockAccess.unlockAttempts.push(unlockAttempt);
      await booking.save();

      return res.status(200).json({
        status: 'success',
        message: 'Room unlocked successfully',
        data: {
          roomNumber: booking.room?.number || booking.room?.name,
          bookingNumber: booking.bookingNumber,
          unlockedAt: unlockAttempt.timestamp,
          diagnostics
        }
      });
    } else {
      // Log failed attempt
      unlockAttempt.error = 'Failed to communicate with smart lock device';
      unlockAttempt.success = false;
      booking.smartLockAccess.unlockAttempts.push(unlockAttempt);
      await booking.save();

      return res.status(500).json({
        status: 'error',
        message: 'Failed to unlock room. Device may be offline or may not support the selected remote unlock method.',
        backupPin: booking.smartLockAccess.backupPin,
        backupPinInstructions: 'Use the backup PIN code to unlock the room manually',
        diagnostics
      });
    }
  } catch (error) {
    console.error('Error unlocking room:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Unlock using backup PIN
 * POST /smart-lock/unlock-with-pin
 */
export const unlockWithPin = async (req, res) => {
  try {
    const { backupPin, bookingNumber } = req.body;

    if (!backupPin || !bookingNumber) {
      return res.status(400).json({
        status: 'failed',
        message: 'Backup PIN and booking number are required'
      });
    }

    const booking = await Booking.findOne({
      bookingNumber,
      'smartLockAccess.backupPin': backupPin
    })
      .populate({
        path: 'room',
        populate: { path: 'smartLockDevice', select: 'deviceId tuyaDeviceId ttlockDeviceId status' }
      })
      .populate('hotel');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Invalid PIN or booking number'
      });
    }

    // Check if access is still valid
    const now = new Date();
    const expiresAt = new Date(booking.smartLockAccess.expiresAt);

    if (now > expiresAt) {
      return res.status(400).json({
        status: 'failed',
        message: 'Access code has expired'
      });
    }

    const smartLockTarget = booking.room?.smartLockDevice?.tuyaDeviceId
      || booking.room?.smartLockDevice?.ttlockDeviceId
      || booking.room?.smartLockDevice?.deviceId
      || booking.room?.smartLockId;

    // Unlock the device
    const unlockAttempt = {
      timestamp: new Date(),
      success: false,
      deviceId: smartLockTarget || null
    };

    const unlockSuccess = await unlockSmartLockDevice(
      booking.hotel?._id,
      smartLockTarget
    );

    if (unlockSuccess) {
      unlockAttempt.success = true;
      booking.smartLockAccess.unlockAttempts.push(unlockAttempt);
      await booking.save();

      return res.status(200).json({
        status: 'success',
        message: 'Room unlocked successfully',
        data: {
          roomNumber: booking.room?.number || booking.room?.name,
          unlockedAt: unlockAttempt.timestamp
        }
      });
    } else {
      unlockAttempt.error = 'Device offline';
      booking.smartLockAccess.unlockAttempts.push(unlockAttempt);
      await booking.save();

      return res.status(500).json({
        status: 'error',
        message: 'Failed to unlock room. Device may be offline.'
      });
    }
  } catch (error) {
    console.error('Error unlocking with PIN:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Get unlock history for a booking
 * GET /smart-lock/history/:bookingId
 */
export const getUnlockHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({
        status: 'failed',
        message: 'Invalid booking ID'
      });
    }

    const booking = await Booking.findById(bookingId)
      .select('smartLockAccess bookingNumber')
      .populate('room', 'number name');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Booking not found'
      });
    }

    const smartLockAccessData = booking.smartLockAccess
      ? (typeof booking.smartLockAccess.toObject === 'function'
        ? booking.smartLockAccess.toObject()
        : booking.smartLockAccess)
      : null;

    return res.status(200).json({
      status: 'success',
      data: {
        bookingNumber: booking.bookingNumber,
        unlockHistory: booking.smartLockAccess?.unlockAttempts || [],
        enabled: booking.smartLockAccess?.enabled || false
      }
    });
  } catch (error) {
    console.error('Error fetching unlock history:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch unlock history'
    });
  }
};

export const getBookingSmartLockAccess = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({
        status: 'failed',
        message: 'Invalid booking ID'
      });
    }

    let booking = await Booking.findById(bookingId)
      .select('bookingNumber checkInDate checkOutDate status smartLockAccess')
      .populate({
        path: 'room',
        select: 'roomNumber roomType accessMode contactlessReady smartLockDevice doorSensorDevice',
        populate: [
          { path: 'smartLockDevice', select: 'deviceId deviceType status' },
          { path: 'doorSensorDevice', select: 'deviceId deviceType status' }
        ]
      })
      .populate('hotel', 'name contactlessCheckInEnabled');

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Booking not found'
      });
    }

    const shouldAutoProvision = booking.status === 'confirmed'
      && booking.hotel?.contactlessCheckInEnabled === true
      && booking.room?.smartLockDevice
      && (
        !booking.smartLockAccess?.enabled
        || !booking.smartLockAccess?.accessToken
        || !booking.smartLockAccess?.backupPin
      );

    if (shouldAutoProvision) {
      try {
        const provisioned = await provisionSmartLockAccessForBooking({
          bookingId,
          hotelId: booking.hotel?._id?.toString(),
          sendEmail: false,
          setupDevice: true
        });
        booking = provisioned.booking;
      } catch (provisionError) {
        console.warn('⚠️ Failed to auto-provision booking smart lock access during fetch:', bookingId, provisionError.message);
      }
    }

    const smartLockTarget = booking.room?.smartLockDevice?.tuyaDeviceId
      || booking.room?.smartLockDevice?.ttlockDeviceId
      || booking.room?.smartLockDevice?.deviceId
      || booking.room?.smartLockId;
    const remoteUnlockSupport = smartLockTarget
      ? await SmartLockService.supportsRemoteUnlock(smartLockTarget).catch(() => ({
        supported: false,
        codes: []
      }))
      : { supported: false, codes: [] };
    const smartLockAccessData = booking.smartLockAccess
      ? (typeof booking.smartLockAccess.toObject === 'function'
        ? booking.smartLockAccess.toObject()
        : booking.smartLockAccess)
      : null;

    return res.status(200).json({
      status: 'success',
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        hotelName: booking.hotel?.name || 'Hotel',
        contactlessCheckInEnabled: booking.hotel?.contactlessCheckInEnabled === true,
        room: booking.room,
        smartLockAccess: smartLockAccessData ? {
          ...smartLockAccessData,
          mobileUnlockSupported: remoteUnlockSupport.supported,
          mobileUnlockMessage: remoteUnlockSupport.supported
            ? 'Phone unlock is available for this lock.'
            : 'Phone unlock is not supported for this lock. Use the 10-digit door PIN on the keypad instead.'
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching smart lock access for booking:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch smart lock access'
    });
  }
};

/**
 * Unlock actual Tuya smart lock device
 */
const unlockSmartLockDevice = async (hotelId, deviceId) => {
  try {
    if (!deviceId) {
      console.warn('No device ID provided for unlock');
      return false;
    }

    // Check if device is online first
    const isOnline = await SmartLockService.isDeviceOnline(deviceId);
    if (!isOnline) {
      console.warn('Device offline:', deviceId);
      return false;
    }

    // Send unlock command to device
    const result = await SmartLockService.unlockDevice(deviceId);

    if (result.success) {
      console.log('✅ Device unlocked successfully:', deviceId);
      return true;
    } else {
      console.error('❌ Failed to unlock device:', deviceId, result.error);
      return false;
    }
  } catch (error) {
    console.error('Error unlocking smart lock device:', error);
    return false;
  }
};

const collectUnlockDiagnostics = async (deviceId) => {
  if (!deviceId) {
    return null;
  }

  const endTimeMs = Date.now();
  const startTimeMs = endTimeMs - (5 * 60 * 1000);

  const [status, openLogs, alarmLogs] = await Promise.all([
    SmartLockService.getDeviceStatus(deviceId).catch((error) => ({
      success: false,
      error: error.message
    })),
    SmartLockService.getDoorLockOpenLogs(deviceId, startTimeMs, endTimeMs).catch((error) => ({
      success: false,
      error: error.message
    })),
    SmartLockService.getDoorLockAlarmLogs(deviceId, startTimeMs, endTimeMs).catch((error) => ({
      success: false,
      error: error.message
    }))
  ]);

  return {
    collectedAt: new Date().toISOString(),
    status: status?.success ? {
      lockStatus: status.lockStatus,
      battery: status.battery,
      rawStatus: status.rawStatus
    } : null,
    openLogs: openLogs?.success ? openLogs.logs : null,
    alarmLogs: alarmLogs?.success ? alarmLogs.logs : null,
    errors: [
      status?.success ? null : status?.error,
      openLogs?.success ? null : openLogs?.error,
      alarmLogs?.success ? null : alarmLogs?.error
    ].filter(Boolean)
  };
};

/**
 * Revoke smart lock access
 * POST /smart-lock/revoke/:bookingId
 */
export const revokeSmartLockAccess = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await revokeSmartLockAccessForBooking(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Booking not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Smart lock access revoked',
      data: booking
    });
  } catch (error) {
    console.error('Error revoking smart lock access:', error);
    return res.status(error.statusCode || 500).json({
      status: error.statusCode ? 'failed' : 'error',
      message: 'Failed to revoke smart lock access'
    });
  }
};
