import crypto from 'crypto';
import Device from '../models/Device.js';
import Room from '../models/Room.js';
import Staff from '../models/Staff.js';
import SmartAccessGrant from '../models/SmartAccessGrant.js';
import SmartLockService from '../services/smartLockService.js';
import { buildLockIdentityReference, buildStaffLockIdentity } from '../services/smartLockIdentityService.js';

const generateAccessCode = (length = 7) => {
  const digits = Math.max(4, Number(length) || 7);
  const min = 10 ** (digits - 1);
  const max = (10 ** digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};
const generateAccessToken = () => crypto.randomBytes(16).toString('hex');

const resolveRoomLockDevice = async (hotelId, roomId) => {
  const room = await Room.findOne({ _id: roomId, hotel: hotelId })
    .populate('smartLockDevice', 'deviceId tuyaDeviceId ttlockDeviceId status');

  if (!room) {
    throw new Error('Room not found');
  }

  if (!room.smartLockDevice) {
    throw new Error('This room does not have a smart lock assigned');
  }

  return room;
};

const hasWindowOverlap = (existingFrom, existingUntil, nextFrom, nextUntil) =>
  existingFrom < nextUntil && existingUntil > nextFrom;

export const getSmartAccessGrants = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { subjectType, status = 'active' } = req.query;
    const filter = { hotel: hotelId };

    if (subjectType) filter.subjectType = subjectType;
    if (status) filter.status = status;

    const grants = await SmartAccessGrant.find(filter)
      .populate('room', 'roomNumber accessMode contactlessReady monitoringEnabled')
      .populate('device', 'deviceId deviceType tuyaDeviceId ttlockDeviceId status')
      .populate('subjectStaff', 'name email position department status')
      .populate('subjectUser', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: grants
    });
  } catch (error) {
    console.error('Error fetching smart access grants:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch smart access grants'
    });
  }
};

export const refreshSmartAccessGrantStatus = async (req, res) => {
  try {
    const { hotelId, grantId } = req.params;

    const grant = await SmartAccessGrant.findOne({ _id: grantId, hotel: hotelId })
      .populate('room', 'roomNumber accessMode contactlessReady monitoringEnabled')
      .populate('device', 'deviceId deviceType tuyaDeviceId ttlockDeviceId status')
      .populate('subjectStaff', 'name email position department status')
      .populate('subjectUser', 'name email');

    if (!grant) {
      return res.status(404).json({
        status: 'failed',
        message: 'Smart access grant not found'
      });
    }

    const smartLockTarget = grant.device?.tuyaDeviceId || grant.device?.ttlockDeviceId || grant.device?.deviceId;
    const tuyaPasswordId = grant.metadata?.tuyaPasswordId;

    if (!smartLockTarget || !tuyaPasswordId) {
      return res.status(400).json({
        status: 'failed',
        message: 'This grant does not have a smart lock password reference to refresh.'
      });
    }

    const passwordStatus = await SmartLockService.getDoorLockTemporaryPassword(smartLockTarget, tuyaPasswordId);
    grant.metadata = {
      ...(grant.metadata || {}),
      tuyaPasswordStatus: passwordStatus || null,
      tuyaPasswordStatusSettled: Boolean(passwordStatus && passwordStatus.phase !== 1 && passwordStatus.delivery_status !== 1),
      tuyaPasswordStatusAttempts: 0
    };
    await grant.save();

    return res.status(200).json({
      status: 'success',
      message: passwordStatus ? 'Lock status refreshed.' : 'No Tuya password status was returned for this grant.',
      data: grant
    });
  } catch (error) {
    console.error('Error refreshing smart access grant status:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to refresh smart access grant status'
    });
  }
};

export const syncRoomLockPasswords = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const room = await resolveRoomLockDevice(hotelId, roomId);
    const device = room.smartLockDevice;
    const smartLockTarget = device?.tuyaDeviceId || device?.ttlockDeviceId || device?.deviceId;

    if (!smartLockTarget) {
      return res.status(400).json({
        status: 'failed',
        message: 'Assigned smart lock is missing a device identifier'
      });
    }

    const result = await SmartLockService.syncUnlockMethods(smartLockTarget, 'unlock_password');
    return res.status(200).json({
      status: 'success',
      message: 'Lock password sync requested successfully.',
      data: {
        room: {
          _id: room._id,
          roomNumber: room.roomNumber
        },
        device: {
          _id: device._id,
          deviceId: device.deviceId,
          smartLockTarget
        },
        result
      }
    });
  } catch (error) {
    console.error('Error syncing room lock passwords:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to sync lock passwords'
    });
  }
};

export const getRoomTuyaPasswords = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const room = await resolveRoomLockDevice(hotelId, roomId);
    const device = room.smartLockDevice;
    const smartLockTarget = device?.tuyaDeviceId || device?.ttlockDeviceId || device?.deviceId;

    if (!smartLockTarget) {
      return res.status(400).json({
        status: 'failed',
        message: 'Assigned smart lock is missing a device identifier'
      });
    }

    const [tuyaPasswordsResult, grants, capabilityResult] = await Promise.all([
      SmartLockService.listDoorLockTemporaryPasswords(smartLockTarget, true),
      SmartAccessGrant.find({
        hotel: hotelId,
        room: room._id,
        device: device._id
      })
        .populate('subjectStaff', 'name email position department status')
        .populate('subjectUser', 'name email')
        .sort({ createdAt: -1 }),
      SmartLockService.getDeviceCapabilities(smartLockTarget).catch(() => ({ codes: [] }))
    ]);

    const tuyaPasswords = Array.isArray(tuyaPasswordsResult)
      ? tuyaPasswordsResult
      : (tuyaPasswordsResult?.list || tuyaPasswordsResult?.passwords || []);

    const localGrantByPasswordId = new Map(
      grants
        .filter((grant) => grant.metadata?.tuyaPasswordId)
        .map((grant) => [String(grant.metadata.tuyaPasswordId), grant])
    );

    const defaultProvisioningMethod = Array.isArray(capabilityResult?.codes) && capabilityResult.codes.includes('unlock_offline_pd')
      ? 'door-lock/offline-temp-password'
      : 'door-lock/temp-password';

    const allRecords = tuyaPasswords.map((item) => {
      const passwordId = String(item?.id ?? item?.password_id ?? '');
      const localGrant = localGrantByPasswordId.get(passwordId) || null;
      const localGrantStatus = localGrant?.status || null;
      return {
        passwordId,
        name: item?.name || item?.offline_temp_password_name || '',
        phase: item?.phase ?? null,
        effectiveTime: item?.effective_time ?? null,
        invalidTime: item?.invalid_time ?? null,
        timeZone: item?.time_zone || null,
        provisioningMethod: localGrant?.metadata?.provisioningMethod || defaultProvisioningMethod,
        localGrantId: localGrant?._id || null,
        localGrantStatus,
        localAccessCode: localGrant?.accessCode || null,
        localSubjectName: localGrant?.subjectStaff?.name || localGrant?.subjectUser?.name || null,
        orphaned: !localGrant || localGrantStatus !== 'active',
        raw: item
      };
    });

    const records = allRecords.filter((record) => ![3, 4].includes(Number(record.phase)));
    const hiddenInactiveCount = allRecords.length - records.length;

    return res.status(200).json({
      status: 'success',
      message: 'Room Tuya password records retrieved successfully.',
      data: {
        room: {
          _id: room._id,
          roomNumber: room.roomNumber
        },
        device: {
          _id: device._id,
          deviceId: device.deviceId,
          smartLockTarget
        },
        records,
        hiddenInactiveCount
      }
    });
  } catch (error) {
    console.error('Error fetching room Tuya passwords:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch room Tuya passwords'
    });
  }
};

export const deleteRoomTuyaPassword = async (req, res) => {
  try {
    const { hotelId, roomId, passwordId } = req.params;
    const { provisioningMethod } = req.body || {};
    const room = await resolveRoomLockDevice(hotelId, roomId);
    const device = room.smartLockDevice;
    const smartLockTarget = device?.tuyaDeviceId || device?.ttlockDeviceId || device?.deviceId;

    if (!smartLockTarget) {
      return res.status(400).json({
        status: 'failed',
        message: 'Assigned smart lock is missing a device identifier'
      });
    }

    const localGrant = await SmartAccessGrant.findOne({
      hotel: hotelId,
      room: room._id,
      device: device._id,
      'metadata.tuyaPasswordId': passwordId
    }).sort({ createdAt: -1 });

    const capabilityResult = await SmartLockService.getDeviceCapabilities(smartLockTarget).catch(() => ({ codes: [] }));
    const fallbackProvisioningMethod = Array.isArray(capabilityResult?.codes) && capabilityResult.codes.includes('unlock_offline_pd')
      ? 'door-lock/offline-temp-password'
      : 'door-lock/temp-password';

    const deleteResult = await SmartLockService.removeTemporaryAccess(smartLockTarget, {
      passwordId,
      provisioningMethod: provisioningMethod || localGrant?.metadata?.provisioningMethod || fallbackProvisioningMethod
    });

    if (!deleteResult?.success) {
      return res.status(502).json({
        status: 'failed',
        message: deleteResult?.error || 'Failed to delete Tuya password'
      });
    }

    if (localGrant && localGrant.status === 'active') {
      localGrant.status = 'revoked';
      localGrant.revokedAt = new Date();
      await localGrant.save();
    }

    return res.status(200).json({
      status: 'success',
      message: 'Tuya password deleted successfully.',
      data: {
        passwordId,
        roomId: room._id
      }
    });
  } catch (error) {
    console.error('Error deleting room Tuya password:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete room Tuya password'
    });
  }
};

export const inspectSmartAccessGrantAllocation = async (req, res) => {
  try {
    const { hotelId, grantId } = req.params;

    const grant = await SmartAccessGrant.findOne({ _id: grantId, hotel: hotelId })
      .populate('room', 'roomNumber accessMode contactlessReady monitoringEnabled')
      .populate('device', 'deviceId deviceType tuyaDeviceId ttlockDeviceId status')
      .populate('subjectStaff', 'name email position department status')
      .populate('subjectUser', 'name email');

    if (!grant) {
      return res.status(404).json({
        status: 'failed',
        message: 'Smart access grant not found'
      });
    }

    const smartLockTarget = grant.device?.tuyaDeviceId || grant.device?.ttlockDeviceId || grant.device?.deviceId;
    const tuyaIdentity = grant.metadata?.tuyaIdentity || null;
    const tuyaUserId = tuyaIdentity?.tuyaUserId || tuyaIdentity?.ttlockUserId || null;

    if (!smartLockTarget) {
      return res.status(400).json({
        status: 'failed',
        message: 'This grant does not have a smart lock device identifier.'
      });
    }

    const [unassignedPasswordKeys, assignedPasswordKeys] = await Promise.all([
      SmartLockService.listUnassignedUnlockKeys(smartLockTarget, 'password').catch((error) => ({
        error: error.message
      })),
      tuyaUserId
        ? SmartLockService.listAssignedUnlockKeys(smartLockTarget, tuyaUserId, 'password').catch((error) => ({
          error: error.message
        }))
        : Promise.resolve([])
    ]);

    return res.status(200).json({
      status: 'success',
      message: 'Smart access grant allocation inspection completed.',
      data: {
        grant,
        inspection: {
          tuyaDeviceId: grant.device?.tuyaDeviceId,
          ttlockDeviceId: grant.device?.ttlockDeviceId,
          tuyaUserId,
          pendingPasswordId: tuyaIdentity?.pendingPasswordId || null,
          unlockSn: tuyaIdentity?.unlockSn || null,
          unlockType: tuyaIdentity?.unlockType || null,
          unassignedPasswordKeys,
          assignedPasswordKeys
        }
      }
    });
  } catch (error) {
    console.error('Error inspecting smart access grant allocation:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to inspect smart access grant allocation'
    });
  }
};

export const allocateSmartAccessGrantPassword = async (req, res) => {
  try {
    const { hotelId, grantId } = req.params;

    const grant = await SmartAccessGrant.findOne({ _id: grantId, hotel: hotelId })
      .populate('room', 'roomNumber accessMode contactlessReady monitoringEnabled')
      .populate('device', 'deviceId deviceType tuyaDeviceId ttlockDeviceId status')
      .populate('subjectStaff', 'name email position department status')
      .populate('subjectUser', 'name email');

    if (!grant) {
      return res.status(404).json({
        status: 'failed',
        message: 'Smart access grant not found'
      });
    }

    const smartLockTarget = grant.device?.tuyaDeviceId || grant.device?.ttlockDeviceId || grant.device?.deviceId;
    const tuyaIdentity = grant.metadata?.tuyaIdentity || null;
    const tuyaUserId = tuyaIdentity?.tuyaUserId || tuyaIdentity?.ttlockUserId || null;
    const pendingPasswordId = tuyaIdentity?.pendingPasswordId || grant.metadata?.tuyaPasswordId || null;

    if (!smartLockTarget) {
      return res.status(400).json({
        status: 'failed',
        message: 'This grant does not have a smart lock device identifier.'
      });
    }

    if (!tuyaUserId) {
      return res.status(400).json({
        status: 'failed',
        message: 'This grant is not linked to a lock user yet.'
      });
    }

    if (tuyaIdentity?.unlockSn && tuyaIdentity?.unlockType) {
      return res.status(200).json({
        status: 'success',
        message: 'This grant is already linked to a lock unlock method.',
        data: grant
      });
    }

    const [unassignedPasswordKeys, assignedPasswordKeys] = await Promise.all([
      SmartLockService.listUnassignedUnlockKeys(smartLockTarget, 'password'),
      SmartLockService.listAssignedUnlockKeys(smartLockTarget, tuyaUserId, 'password')
    ]);

    const normalizeUnlockSn = (item) => {
      const rawValue = item?.unlock_no ?? item?.unlock_sn ?? item?.sn ?? item?.id ?? null;
      const numericValue = Number(rawValue);
      return Number.isFinite(numericValue) ? numericValue : rawValue;
    };

    const singleAssignedKey = Array.isArray(assignedPasswordKeys) && assignedPasswordKeys.length === 1
      ? assignedPasswordKeys[0]
      : null;
    const singleUnassignedKey = Array.isArray(unassignedPasswordKeys) && unassignedPasswordKeys.length === 1
      ? unassignedPasswordKeys[0]
      : null;

    let unlockSn = singleAssignedKey ? normalizeUnlockSn(singleAssignedKey) : null;
    let unlockType = singleAssignedKey?.unlock_type || singleAssignedKey?.unlockType || 'password';
    let allocationResult = null;

    if (!unlockSn) {
      if (!singleUnassignedKey) {
        return res.status(409).json({
          status: 'failed',
          message: 'Unable to allocate a lock password slot safely. Expected exactly one unassigned password slot.',
          data: {
            unassignedPasswordKeys,
            assignedPasswordKeys
          }
        });
      }

      unlockSn = normalizeUnlockSn(singleUnassignedKey);
      unlockType = singleUnassignedKey?.unlock_type || singleUnassignedKey?.unlockType || 'password';

      if (!unlockSn) {
        return res.status(409).json({
          status: 'failed',
          message: 'Tuya returned an unassigned password slot without a usable unlock number.',
          data: {
            unassignedPasswordKeys,
            assignedPasswordKeys
          }
        });
      }

      allocationResult = await SmartLockService.allocateUnlockMethods(smartLockTarget, tuyaUserId, [
        {
          dp_code: 'unlock_password',
          unlock_sn: unlockSn
        }
      ]);
    }

    grant.metadata = {
      ...(grant.metadata || {}),
      tuyaIdentity: {
        ...(tuyaIdentity || {}),
        tuyaUserId,
        pendingPasswordId,
        unlockSn,
        unlockType,
        syncState: 'allocated',
        lastSyncedAt: new Date()
      },
      tuyaAllocationResult: allocationResult || grant.metadata?.tuyaAllocationResult || null
    };

    await grant.save();
    await grant.populate('room', 'roomNumber accessMode contactlessReady monitoringEnabled');
    await grant.populate('device', 'deviceId deviceType tuyaDeviceId ttlockDeviceId status');
    await grant.populate('subjectStaff', 'name email position department status');
    await grant.populate('subjectUser', 'name email');

    return res.status(200).json({
      status: 'success',
      message: allocationResult
        ? 'Lock password slot allocated to the Tuya user successfully.'
        : 'This grant already had a matching assigned password slot.',
      data: grant
    });
  } catch (error) {
    console.error('Error allocating smart access grant password:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to allocate smart access grant password'
    });
  }
};

export const assignStaffSmartAccess = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { staffId, roomId, validFrom, validUntil, timeZone, notes } = req.body;

    if (!staffId || !roomId || !validFrom || !validUntil) {
      return res.status(400).json({
        status: 'failed',
        message: 'staffId, roomId, validFrom, and validUntil are required'
      });
    }

    const [staff, room] = await Promise.all([
      Staff.findOne({ _id: staffId, hotel: hotelId }),
      resolveRoomLockDevice(hotelId, roomId)
    ]);

    if (!staff) {
      return res.status(404).json({
        status: 'failed',
        message: 'Staff member not found'
      });
    }

    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(untilDate.getTime()) || fromDate >= untilDate) {
      return res.status(400).json({
        status: 'failed',
        message: 'Invalid access window'
      });
    }

    const overlappingGrant = await SmartAccessGrant.findOne({
      hotel: hotelId,
      room: room._id,
      subjectType: 'staff',
      subjectStaff: staff._id,
      status: 'active',
      validFrom: { $lt: untilDate },
      validUntil: { $gt: fromDate }
    }).populate('room', 'roomNumber');

    if (overlappingGrant && hasWindowOverlap(overlappingGrant.validFrom, overlappingGrant.validUntil, fromDate, untilDate)) {
      return res.status(409).json({
        status: 'failed',
        message: `An active temporary key already exists for ${staff.name} in room ${room.roomNumber} during that time window.`,
        data: {
          existingGrantId: overlappingGrant._id,
          existingValidFrom: overlappingGrant.validFrom,
          existingValidUntil: overlappingGrant.validUntil,
          existingAccessCode: overlappingGrant.accessCode
        }
      });
    }

    const device = room.smartLockDevice;
    const identity = buildStaffLockIdentity(staff);
    const provisionalAccessCode = generateAccessCode(7);
    const smartLockTarget = device.tuyaDeviceId || device.ttlockDeviceId || device.deviceId;
    const expiresIn = Math.max(300, Math.floor((untilDate.getTime() - Date.now()) / 1000));
    let tuyaIdentityRef = buildLockIdentityReference(identity);

    if (smartLockTarget) {
      try {
        const ensuredUser = await SmartLockService.ensureDeviceUser(smartLockTarget, identity);
        tuyaIdentityRef = buildLockIdentityReference(identity, {
          tuyaUserId: tuyaIdentityRef.provider === 'tuya' ? ensuredUser.userId : null,
          ttlockUserId: tuyaIdentityRef.provider === 'ttlock' ? ensuredUser.userId : null,
          syncState: ensuredUser.created ? 'created' : 'linked',
          lastSyncedAt: new Date()
        });
      } catch (identityError) {
        console.warn('⚠️ Failed to ensure smart lock device user for staff access:', identity.localId, identityError.message);
        tuyaIdentityRef = buildLockIdentityReference(identity, {
          syncState: 'error'
        });
      }
    }

    let deviceProvisioned = false;
    let provisioningError = null;
    let provisionResult = null;
    if (smartLockTarget) {
      try {
        provisionResult = await SmartLockService.addTemporaryAccess(
          smartLockTarget,
          staff.name,
          provisionalAccessCode,
          expiresIn,
          timeZone
        );
        deviceProvisioned = provisionResult.success === true;
        provisioningError = provisionResult.error || null;
      } catch (provisionError) {
        const providerMessage = provisionError?.message || 'Failed to provision the temporary smart key on the lock';
        const normalizedProviderMessage = providerMessage.toLowerCase();

        if (normalizedProviderMessage.includes('offline passwords exceeds the limit') || normalizedProviderMessage.includes('offline password') && normalizedProviderMessage.includes('exceeds the limit')) {
          return res.status(409).json({
            status: 'failed',
            message: 'This lock already has too many overlapping offline passwords. Revoke an existing key or shorten the requested access window before issuing another one.'
          });
        }

        throw provisionError;
      }
    } else {
      provisioningError = 'Assigned smart lock is missing a device identifier';
    }

    const accessCode = provisionResult?.accessCode || provisionalAccessCode;
    tuyaIdentityRef = {
      ...tuyaIdentityRef,
      pendingPasswordId: provisionResult?.result?.offline_temp_password_id || provisionResult?.result?.id || null
    };

    if (!deviceProvisioned) {
      const normalizedProvisioningError = String(provisioningError || '').toLowerCase();
      if (
        normalizedProvisioningError.includes('offline passwords exceeds the limit')
        || (normalizedProvisioningError.includes('offline password') && normalizedProvisioningError.includes('exceeds the limit'))
      ) {
        return res.status(409).json({
          status: 'failed',
          message: 'This lock already has too many overlapping offline passwords. Revoke an existing key or shorten the requested access window before issuing another one.',
          data: {
            room: {
              _id: room._id,
              roomNumber: room.roomNumber
            },
            device: {
              _id: device._id,
              deviceId: device.deviceId,
              tuyaDeviceId: device.tuyaDeviceId,
              ttlockDeviceId: device.ttlockDeviceId
            },
            subjectStaff: {
              _id: staff._id,
              name: staff.name,
              email: staff.email
            },
            accessCode,
            deviceProvisioned
          }
        });
      }

      return res.status(502).json({
        status: 'failed',
        message: provisioningError || 'Failed to provision the temporary smart key on the lock',
        data: {
          room: {
            _id: room._id,
            roomNumber: room.roomNumber
          },
          device: {
            _id: device._id,
            deviceId: device.deviceId,
            tuyaDeviceId: device.tuyaDeviceId,
            ttlockDeviceId: device.ttlockDeviceId
          },
          subjectStaff: {
            _id: staff._id,
            name: staff.name,
            email: staff.email
          },
          accessCode,
          deviceProvisioned
        }
      });
    }

    const grant = await SmartAccessGrant.create({
      hotel: hotelId,
      room: room._id,
      device: device._id,
      subjectType: 'staff',
      subjectStaff: staff._id,
      grantType: 'staff-shift',
      accessCode,
      accessToken: generateAccessToken(),
      validFrom: fromDate,
      validUntil: untilDate,
      metadata: {
        notes: notes || '',
        timeZone: timeZone || null,
        tuyaIdentity: tuyaIdentityRef,
        deviceProvisioned,
        provisioningMethod: provisionResult.provisioningMethod || null,
        tuyaPasswordId: provisionResult.result?.id || provisionResult.result?.offline_temp_password_id || null,
        tuyaProvisioningResult: provisionResult.result || null,
        tuyaPasswordStatus: provisionResult.passwordStatus || null,
        tuyaPasswordStatusSettled: provisionResult.passwordStatusSettled || false,
        tuyaPasswordStatusAttempts: provisionResult.passwordStatusAttempts || 0
      }
    });

    await grant.populate('room', 'roomNumber accessMode contactlessReady monitoringEnabled');
    await grant.populate('subjectStaff', 'name email position department');
    await grant.populate('device', 'deviceId deviceType tuyaDeviceId ttlockDeviceId status');

    return res.status(201).json({
      status: 'success',
      message: 'Staff smart key assigned successfully',
      data: grant
    });
  } catch (error) {
    console.error('Error assigning staff smart access:', error);
    const message = error.message || 'Failed to assign staff smart access';
    const normalizedMessage = message.toLowerCase();
    if (normalizedMessage.includes('offline passwords exceeds the limit') || normalizedMessage.includes('offline password') && normalizedMessage.includes('exceeds the limit')) {
      return res.status(409).json({
        status: 'failed',
        message: 'This lock already has too many overlapping offline passwords. Revoke an existing key or shorten the requested access window before issuing another one.'
      });
    }
    return res.status(500).json({
      status: 'error',
      message
    });
  }
};

export const revokeSmartAccessGrant = async (req, res) => {
  try {
    const { hotelId, grantId } = req.params;

    const grant = await SmartAccessGrant.findOne({ _id: grantId, hotel: hotelId })
      .populate('device', 'deviceId tuyaDeviceId ttlockDeviceId')
      .populate('room', 'roomNumber');

    if (!grant) {
      return res.status(404).json({
        status: 'failed',
        message: 'Smart access grant not found'
      });
    }

    if (grant.status !== 'active') {
      return res.status(200).json({
        status: 'success',
        message: 'Smart access grant already inactive',
        data: grant
      });
    }

    const smartLockTarget = grant.device?.tuyaDeviceId || grant.device?.ttlockDeviceId || grant.device?.deviceId;
    const revokeReference = grant.metadata?.tuyaPasswordId
      ? {
        passwordId: grant.metadata.tuyaPasswordId,
        provisioningMethod: grant.metadata?.provisioningMethod || null
      }
      : grant.accessCode;
    if (smartLockTarget && revokeReference) {
      await SmartLockService.removeTemporaryAccess(smartLockTarget, revokeReference);
    }

    grant.status = 'revoked';
    grant.revokedAt = new Date();
    await grant.save();

    return res.status(200).json({
      status: 'success',
      message: 'Smart access grant revoked successfully',
      data: grant
    });
  } catch (error) {
    console.error('Error revoking smart access grant:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to revoke smart access grant'
    });
  }
};
