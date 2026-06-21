import QRCode from 'qrcode';
import Booking from '../models/Booking.js';
import IdentityVerificationSession from '../models/IdentityVerificationSession.js';
import Room from '../models/Room.js';
import { provisionSmartLockAccessForBooking } from './smartLockController.js';
import { createBookingReference, identityVerificationProvider } from '../services/identityVerificationProvider.js';
import { notifyIdentityUpdate, registerIdentitySseStream, unregisterIdentitySseStream } from '../services/identityRealtimeService.js';

const buildContactlessBookingNumber = () => `BK-${Date.now().toString().slice(-10)}`;

const findHotelBooking = async (hotelId, bookingId) => Booking.findOne({
  _id: bookingId,
  hotel: hotelId
})
  .populate('guest', 'name email phone')
  .populate('hotel', 'name contactlessCheckInEnabled')
  .populate('room', 'roomNumber roomType smartLockDevice');

const generateQrCodeImage = async (url) => {
  try {
    return await QRCode.toDataURL(url);
  } catch (error) {
    console.warn('Failed to generate identity session QR code:', error.message);
    return null;
  }
};

const isSessionExpired = (session) => {
  if (!session) return false;

  // Finished or in-progress sessions should not expire based on QR handoff TTL
  const finishedStatuses = ['verified', 'submitted', 'manual_review', 'rejected', 'cancelled'];
  if (finishedStatuses.includes(session.status)) {
    return false;
  }

  // If they've already started the external provider flow (Didit), don't expire
  if (session.externalSessionId) {
    return false;
  }

  const expiresAt = session.qrSession?.expiresAt ? new Date(session.qrSession.expiresAt) : null;
  return Boolean(expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now());
};

const cleanupPendingContactlessBooking = async ({ hotelId, booking, session, reason, cleanupMode = 'expired' }) => {
  if (session) {
    session.status = 'cancelled';
    session.fallbackRequired = true;
    session.failureReason = reason;
    session.completedAt = new Date();
    if (session.qrSession) {
      session.qrSession.lastAccessedAt = new Date();
    }
    await session.save();
  }

  // Only delete if it's a contactless pending booking and it's actually STALE
  // We don't want to delete a booking just because the guest took 61 minutes to scan their ID
  const bookingAgeMinutes = (Date.now() - new Date(booking.createdAt).getTime()) / (1000 * 60);
  const isStale = bookingAgeMinutes > 120; // 2 hours

  const shouldDeletePendingBooking =
    isStale &&
    booking.paymentMethod === 'contactless' &&
    booking.status === 'pending' &&
    !booking.smartLockAccess?.enabled;

  if (shouldDeletePendingBooking) {
    await Room.findByIdAndUpdate(booking.room?._id || booking.room, { status: 'available' });
    await IdentityVerificationSession.deleteMany({ hotel: hotelId, booking: booking._id });
    await Booking.deleteOne({ _id: booking._id, hotel: hotelId });

    return {
      removed: true,
      mode: cleanupMode
    };
  }

  if (!booking.identityVerification) {
    booking.identityVerification = {};
  }
  
  booking.identityVerification.status = 'rejected';
  booking.identityVerification.fallbackRequired = true;
  booking.identityVerification.rejectedAt = new Date();
  booking.identityVerification.failureReason = reason;

  if (booking.markModified) {
    booking.markModified('identityVerification');
  }
  await booking.save();

  return {
    removed: false,
    mode: cleanupMode
  };
};

const applyVerificationSummaryToBooking = (booking, session, evaluation) => {
  if (!booking.identityVerification) {
    booking.identityVerification = {};
  }
  
  booking.identityVerification.session = session._id;
  booking.identityVerification.bookingReference = evaluation.bookingReference;
  booking.identityVerification.provider = evaluation.provider;
  booking.identityVerification.status = evaluation.status;
  booking.identityVerification.fallbackRequired = evaluation.fallbackRequired;
  booking.identityVerification.qrSessionToken = session.qrSession?.token || booking.identityVerification?.qrSessionToken || '';
  booking.identityVerification.qrSessionExpiresAt = session.qrSession?.expiresAt || booking.identityVerification?.qrSessionExpiresAt || null;
  booking.identityVerification.approvedAt = evaluation.approved ? evaluation.completedAt : null;
  booking.identityVerification.rejectedAt = null;
  booking.identityVerification.reviewedAt = session.review?.reviewedAt || null;
  booking.identityVerification.reviewedBy = session.review?.reviewedBy || null;
  booking.identityVerification.lastSubmittedAt = evaluation.submittedAt;
  booking.identityVerification.failureReason = evaluation.failureReason;
  booking.identityVerification.extractedIdentity = evaluation.extractedIdentity;
  booking.identityVerification.document = evaluation.document;
  booking.identityVerification.checks = evaluation.checks;
  
  if (booking.markModified) {
    booking.markModified('identityVerification');
  }
};

const createOrRefreshMobileSession = async ({ hotelId, booking, baseUrl }) => {
  const mobileSession = identityVerificationProvider.createMobileSession({
    hotelId,
    bookingId: booking._id.toString(),
    bookingReference: booking.identityVerification?.bookingReference || createBookingReference(booking),
    baseUrl
  });
  const qrCodeImage = await generateQrCodeImage(mobileSession.url);

  return {
    qrSession: {
      token: mobileSession.token,
      url: mobileSession.url,
      expiresAt: mobileSession.expiresAt,
      source: mobileSession.source
    },
    qrCodeImage
  };
};

export const createContactlessBooking = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { booking, identity } = req.body;
    const clientBaseUrl = String(req.headers.origin || identity?.clientBaseUrl || '').trim();
    const routeHotelId = hotelId ? hotelId.toString() : '';
    const requestedHotelId = booking?.hotelId ? booking.hotelId.toString() : '';
    const targetHotelId = requestedHotelId || routeHotelId;

    if (!booking?.customerId || !booking?.roomId || !booking?.checkIn || !booking?.checkOut) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required booking fields for contactless booking'
      });
    }

    if (routeHotelId && requestedHotelId && routeHotelId !== requestedHotelId) {
      return res.status(400).json({
        status: 'error',
        message: 'Hotel ID mismatch between booking URL and request body'
      });
    }

    const createdBooking = new Booking({
      bookingNumber: buildContactlessBookingNumber(),
      hotel: targetHotelId,
      guest: booking.customerId,
      room: booking.roomId,
      checkInDate: booking.checkIn,
      checkOutDate: booking.checkOut,
      numberOfGuests: booking.guests,
      numberOfRooms: booking.roomCount,
      totalPrice: booking.totalPrice,
      specialRequests: booking.specialRequests,
      paymentMethod: 'contactless',
      paymentStatus: 'paid',
      status: 'pending',
      identityVerification: {
        provider: identityVerificationProvider.name,
        status: 'pending',
        fallbackRequired: false
      }
    });

    await createdBooking.save();
    await Room.findByIdAndUpdate(booking.roomId, { status: 'reserved' });

    const hydratedBooking = await findHotelBooking(targetHotelId, createdBooking._id);
    const bookingReference = identity?.bookingReference || createBookingReference(hydratedBooking);
    const mobileSession = await createOrRefreshMobileSession({ hotelId: targetHotelId, booking: hydratedBooking, baseUrl: clientBaseUrl });

    const evaluation = await identityVerificationProvider.evaluateIdentityVerification({
      booking: hydratedBooking,
      identityPayload: {
        ...identity,
        bookingReference
      }
    });

    const verificationSession = await IdentityVerificationSession.create({
      hotel: targetHotelId,
      booking: hydratedBooking._id,
      guest: hydratedBooking.guest?._id || null,
      bookingReference: evaluation.bookingReference,
      provider: evaluation.provider,
      source: identity?.usedMobileQr ? 'mobile' : 'web',
      status: evaluation.status,
      fallbackRequired: evaluation.fallbackRequired,
      identityPayload: evaluation.rawPayload,
      document: evaluation.document,
      qrSession: mobileSession.qrSession,
      checks: evaluation.checks,
      extractedIdentity: evaluation.extractedIdentity,
      submittedAt: evaluation.submittedAt,
      completedAt: evaluation.completedAt,
      failureReason: evaluation.failureReason
    });

    applyVerificationSummaryToBooking(hydratedBooking, verificationSession, evaluation);

    let smartKeyData = null;
    if (evaluation.approved) {
      hydratedBooking.status = 'confirmed';
      await hydratedBooking.save();

      try {
        const provisioned = await provisionSmartLockAccessForBooking({
          bookingId: hydratedBooking._id,
          hotelId: targetHotelId,
          sendEmail: true,
          setupDevice: true
        });
        smartKeyData = provisioned.data;
      } catch (accessError) {
        console.warn('Contactless booking verified, but smart key provisioning failed:', accessError.message);
      }
    } else {
      hydratedBooking.status = 'pending';
      await hydratedBooking.save();
    }

    await hydratedBooking.populate('hotel', 'name');
    await hydratedBooking.populate('guest', 'name email phone');
    await hydratedBooking.populate('room', 'roomType bedType amenities roomNumber');

    return res.status(201).json({
      status: 'success',
      message: evaluation.approved
        ? 'Booking created and identity verified successfully'
        : 'Booking created. Identity verification requires manual review before self check-in is approved.',
      data: {
        ...hydratedBooking.toObject(),
        smartKeyAccess: smartKeyData,
        identityVerificationSession: {
          id: verificationSession._id,
          status: verificationSession.status,
          bookingReference: verificationSession.bookingReference,
          qrCode: mobileSession.qrCodeImage,
          qrSession: verificationSession.qrSession,
          checks: verificationSession.checks,
          failureReason: verificationSession.failureReason
        }
      }
    });
  } catch (err) {
    console.error('Error creating booking with contactless verification flow:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create booking with contactless verification flow',
      error: err.message
    });
  }
};

export const getIdentityVerificationSession = async (req, res) => {
  try {
    // Prevent browser caching of identity session states, especially error states like 410 Gone
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { hotelId, bookingId } = req.params;
    const token = String(req.query.token || '').trim();
    const booking = await findHotelBooking(hotelId, bookingId);

    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    let session = await IdentityVerificationSession.findOne({ hotel: hotelId, booking: bookingId }).sort({ createdAt: -1 });
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Identity verification session not found' });
    }

    // If it's a Didit session and not yet verified, try to auto-refresh from Didit API
    // this ensures the dashboard stays in sync even if webhooks fail
    const activeProviderName = identityVerificationProvider.name;
    const externalSessionId = String(req.query.externalSessionId || session.externalSessionId || '').replace(/[{}]/g, '').trim();
    
    console.log(`[DEBUG_LOG] getIdentityVerificationSession: Booking=${bookingId}, ActiveProvider=${activeProviderName}, SessionProvider=${session.provider}, ExternalId=${externalSessionId}`);

    // We auto-refresh if:
    // 1. It's already labeled as a Didit session
    // 2. OR we have an external session ID (manually linked or in query)
    // 3. OR global mode is Didit and we haven't verified yet
    const isDiditMode = activeProviderName === 'didit' || session.provider === 'didit' || !!externalSessionId;
    const forceRefresh = String(req.query.force || '').toLowerCase() === 'true';

    if (isDiditMode && (session.status !== 'verified' || forceRefresh)) {
      try {
        const sessionId = externalSessionId || session.externalSessionId;
        
        if (sessionId) {
          console.log(`🔄 ${forceRefresh ? 'Forcibly' : 'Auto'} refreshing Didit session: ${sessionId} for booking ${bookingId} (Current Status: ${session.status})`);
          const evaluation = await identityVerificationProvider.evaluateIdentityVerification({
            booking,
            identityPayload: { externalSessionId: sessionId },
            existingSession: session
          });

          // Update if evaluation was successful AND:
          // 1. Force refresh requested
          // 2. OR Status changed
          // 3. OR it was previously a mock session
          // 4. OR we didn't have externalSessionId saved
          // 5. OR the name changed
          // 6. OR we are missing critical artifacts (images) and just got them
          // 7. OR we just fetched more detailed warnings
          const currentIdVer = session.extractedIdentity || {};
          const currentDoc = session.document || {};
          
          const isMissingData = !currentIdVer.fullName || (!currentDoc.idFrontImage && !currentDoc.passportImage);
          const hasNewData = evaluation.extractedIdentity?.fullName && evaluation.extractedIdentity.fullName !== currentIdVer.fullName;
          const hasNewArtifacts = (evaluation.document?.idFrontImage && !currentDoc.idFrontImage);

          const shouldUpdate = evaluation && (
            forceRefresh ||
            evaluation.status !== session.status || 
            session.provider !== 'didit' || 
            !session.externalSessionId ||
            isMissingData ||
            hasNewData ||
            hasNewArtifacts ||
            (evaluation.failureReason && evaluation.failureReason !== session.failureReason)
          );

          if (shouldUpdate) {
            console.log(`✅ Didit status updated/refreshed for booking ${bookingId}. Status: ${evaluation.status}`);
            
            // Update Session
            session.status = evaluation.status;
            session.provider = 'didit';
            session.externalSessionId = sessionId;
            session.fallbackRequired = evaluation.fallbackRequired;
            session.identityPayload = evaluation.rawPayload;
            session.document = evaluation.document;
            session.checks = evaluation.checks;
            session.extractedIdentity = evaluation.extractedIdentity;
            session.submittedAt = evaluation.submittedAt || session.submittedAt;
            session.completedAt = evaluation.completedAt || session.completedAt;
            session.failureReason = evaluation.failureReason;
            
            // Ensure we mark it as modified for Mongoose if we are updating nested objects
            session.markModified('document');
            session.markModified('checks');
            session.markModified('extractedIdentity');
            session.markModified('identityPayload');
            
            await session.save();

            // Update Booking
            applyVerificationSummaryToBooking(booking, session, evaluation);
            if (evaluation.approved && booking.status === 'pending') {
              booking.status = 'confirmed';
            }
            await booking.save();
            
            // Re-fetch session to ensure we return updated data
            session = await IdentityVerificationSession.findById(session._id);
          }
        }
      } catch (refreshError) {
        console.warn('⚠️ Failed to auto-refresh Didit session status:', refreshError.message);
      }
    }

    if (isSessionExpired(session)) {
      // Only perform automatic cleanup if a token is provided (mobile guest access).
      // We NEVER return 410 for the hotel dashboard (no token) because staff
      // should be able to see identity details even for expired/old sessions.
      if (token) {
        const cleanup = await cleanupPendingContactlessBooking({
          hotelId,
          booking,
          session,
          reason: 'Identity verification session expired before completion.',
          cleanupMode: 'expired'
        });

        return res.status(410).json({
          status: 'error',
          message: 'Identity verification session expired before completion.',
          data: {
            bookingId,
            removed: cleanup.removed,
            mode: cleanup.mode
          }
        });
      }
      
      console.log(`ℹ️ Identity session expired for booking ${bookingId} but skipping cleanup/410 (dashboard view)`);
    }

    if (token && session.qrSession?.token && session.qrSession.token !== token) {
      return res.status(403).json({ status: 'error', message: 'Invalid mobile identity session token' });
    }

    const qrCode = session.qrSession?.url ? await generateQrCodeImage(session.qrSession.url) : null;

    return res.status(200).json({
      status: 'success',
      _v: 'didit-v3-parser-v2',
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        bookingStatus: booking.status,
        verification: session,
        qrCode
      }
    });
  } catch (error) {
    console.error('Error fetching identity verification session:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch identity verification session' });
  }
};

export const createIdentityMobileSession = async (req, res) => {
  try {
    const { hotelId, bookingId } = req.params;
    const booking = await findHotelBooking(hotelId, bookingId);
    const clientBaseUrl = String(req.headers.origin || '').trim();

    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const existingSession = await IdentityVerificationSession.findOne({ hotel: hotelId, booking: bookingId }).sort({ createdAt: -1 });
    const mobileSession = await createOrRefreshMobileSession({ hotelId, booking, baseUrl: clientBaseUrl });

    let session = existingSession;
    if (!session) {
      session = await IdentityVerificationSession.create({
        hotel: hotelId,
        booking: booking._id,
        guest: booking.guest?._id || null,
        bookingReference: booking.identityVerification?.bookingReference || createBookingReference(booking),
        provider: identityVerificationProvider.name,
        status: 'pending',
        qrSession: mobileSession.qrSession
      });
    } else {
      session.qrSession = mobileSession.qrSession;
      await session.save();
    }

    if (!booking.identityVerification) {
      booking.identityVerification = {};
    }
    
    booking.identityVerification.session = session._id;
    booking.identityVerification.provider = identityVerificationProvider.name;
    booking.identityVerification.status = booking.identityVerification?.status || 'pending';
    booking.identityVerification.bookingReference = session.bookingReference;
    booking.identityVerification.qrSessionToken = session.qrSession?.token || '';
    booking.identityVerification.qrSessionExpiresAt = session.qrSession?.expiresAt || null;

    if (booking.markModified) {
      booking.markModified('identityVerification');
    }
    await booking.save();

    return res.status(200).json({
      status: 'success',
      message: 'Mobile identity session created successfully',
      data: {
        bookingId: booking._id,
        sessionId: session._id,
        bookingReference: session.bookingReference,
        qrSession: session.qrSession,
        qrCode: mobileSession.qrCodeImage
      }
    });
  } catch (error) {
    console.error('Error creating mobile identity session:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to create mobile identity session' });
  }
};

export const createDiditSession = async (req, res) => {
  try {
    const { hotelId, bookingId } = req.params;
    const { callbackUrl } = req.body || {};
    const booking = await findHotelBooking(hotelId, bookingId);

    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const sessionData = await identityVerificationProvider.createDiditSession({
      booking,
      callbackUrl: callbackUrl || `${req.headers.origin}/identity-callback`
    });

    const externalSessionId = sessionData.session_id || sessionData.sessionId;
    const externalSessionUrl = sessionData.url || sessionData.session_url || sessionData.verification_url;

    let session = await IdentityVerificationSession.findOne({ hotel: hotelId, booking: bookingId }).sort({ createdAt: -1 });
    if (!session) {
      session = await IdentityVerificationSession.create({
        hotel: hotelId,
        booking: booking._id,
        guest: booking.guest?._id || null,
        bookingReference: booking.identityVerification?.bookingReference || createBookingReference(booking),
        provider: 'didit',
        status: 'pending',
        externalSessionId: externalSessionId,
        externalSessionUrl: externalSessionUrl
      });
    } else {
      session.provider = 'didit';
      session.externalSessionId = externalSessionId;
      session.externalSessionUrl = externalSessionUrl;
      await session.save();
    }

    if (!booking.identityVerification) {
      booking.identityVerification = {};
    }
    
    booking.identityVerification.session = session._id;
    booking.identityVerification.provider = 'didit';
    booking.identityVerification.status = 'pending';
    booking.identityVerification.externalSessionId = externalSessionId;

    if (booking.markModified) {
      booking.markModified('identityVerification');
    }
    await booking.save();

    return res.status(200).json({
      status: 'success',
      data: {
        sessionId: externalSessionId,
        url: externalSessionUrl
      }
    });
  } catch (error) {
    console.error('Error creating Didit identity session:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to create Didit identity session' });
  }
};

export const submitIdentityVerification = async (req, res) => {
  try {
    const { hotelId, bookingId } = req.params;
    const { identity = {}, source = 'web', token = '' } = req.body || {};
    const booking = await findHotelBooking(hotelId, bookingId);

    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    let session = await IdentityVerificationSession.findOne({ hotel: hotelId, booking: bookingId }).sort({ createdAt: -1 });
    if (!session) {
      session = await IdentityVerificationSession.create({
        hotel: hotelId,
        booking: booking._id,
        guest: booking.guest?._id || null,
        bookingReference: identity.bookingReference || booking.identityVerification?.bookingReference || createBookingReference(booking),
        provider: identityVerificationProvider.name,
        status: 'pending'
      });
    }

    const normalizedToken = String(token || '').trim();
    if (source === 'mobile' && session.qrSession?.token && session.qrSession.token !== normalizedToken) {
      return res.status(403).json({ status: 'error', message: 'Invalid mobile identity session token' });
    }

    // We removed the isSessionExpired check here to be more lenient during submission.
    // As long as the guest has the valid token and the booking hasn't been deleted yet,
    // we should allow them to complete the verification.

    const evaluation = await identityVerificationProvider.evaluateIdentityVerification({
      booking,
      identityPayload: identity,
      existingSession: session
    });

    session.source = source === 'mobile' ? 'mobile' : 'web';
    session.status = evaluation.status;
    session.fallbackRequired = evaluation.fallbackRequired;
    session.identityPayload = evaluation.rawPayload;
    session.document = evaluation.document;
    session.checks = evaluation.checks;
    session.extractedIdentity = evaluation.extractedIdentity;
    session.submittedAt = evaluation.submittedAt;
    session.completedAt = evaluation.completedAt;
    session.failureReason = evaluation.failureReason;
    if (source === 'mobile' && session.qrSession) {
      session.qrSession.completedAt = new Date();
      session.qrSession.lastAccessedAt = new Date();
      session.qrSession.source = 'mobile';
    }
    await session.save();

    notifyIdentityUpdate(bookingId, session);

    applyVerificationSummaryToBooking(booking, session, evaluation);

    let smartKeyData = null;
    if (evaluation.approved) {
      booking.status = 'confirmed';
      await booking.save();
      try {
        const provisioned = await provisionSmartLockAccessForBooking({
          bookingId: booking._id,
          hotelId,
          sendEmail: true,
          setupDevice: true
        });
        smartKeyData = provisioned.data;
      } catch (accessError) {
        console.warn('Identity verified, but smart key provisioning failed:', accessError.message);
      }
    } else {
      booking.status = 'pending';
      await booking.save();
    }

    return res.status(200).json({
      status: 'success',
      message: evaluation.approved
        ? 'Identity verification passed and self check-in has been approved.'
        : 'Identity verification submitted. Manual hotel review is required before self check-in can be approved.',
      data: {
        bookingId: booking._id,
        bookingStatus: booking.status,
        identityVerification: booking.identityVerification,
        verificationSession: session,
        smartKeyAccess: smartKeyData
      }
    });
  } catch (error) {
    console.error('Error submitting identity verification:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to submit identity verification' });
  }
};

export const reviewIdentityVerification = async (req, res) => {
  try {
    const { hotelId, bookingId } = req.params;
    const { decision, reviewedBy, note } = req.body || {};
    const booking = await findHotelBooking(hotelId, bookingId);

    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const session = await IdentityVerificationSession.findOne({ hotel: hotelId, booking: bookingId }).sort({ createdAt: -1 });
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Identity verification session not found' });
    }

    const normalizedDecision = decision === 'approved' ? 'approved' : 'rejected';
    session.review = {
      reviewedBy: reviewedBy || null,
      reviewedAt: new Date(),
      decision: normalizedDecision,
      note: note || ''
    };
    session.status = normalizedDecision === 'approved' ? 'verified' : 'rejected';
    session.fallbackRequired = normalizedDecision !== 'approved';
    session.failureReason = normalizedDecision === 'approved'
      ? ''
      : (note || 'Manual reviewer rejected automated identity verification.');
    await session.save();

    notifyIdentityUpdate(bookingId, session);

    if (!booking.identityVerification) {
      booking.identityVerification = {};
    }
    
    booking.identityVerification.session = session._id;
    booking.identityVerification.provider = session.provider;
    booking.identityVerification.bookingReference = session.bookingReference;
    booking.identityVerification.status = session.status;
    booking.identityVerification.fallbackRequired = session.fallbackRequired;
    booking.identityVerification.reviewedBy = reviewedBy || null;
    booking.identityVerification.reviewedAt = session.review.reviewedAt;
    booking.identityVerification.approvedAt = normalizedDecision === 'approved' ? new Date() : null;
    booking.identityVerification.rejectedAt = normalizedDecision === 'approved' ? null : new Date();
    booking.identityVerification.failureReason = session.failureReason;
    booking.identityVerification.checks = session.checks;

    let smartKeyData = null;
    if (normalizedDecision === 'approved') {
      booking.status = 'confirmed';
      await booking.save();
      try {
        const provisioned = await provisionSmartLockAccessForBooking({
          bookingId: booking._id,
          hotelId,
          sendEmail: true,
          setupDevice: true
        });
        smartKeyData = provisioned.data;
      } catch (accessError) {
        console.warn('Manual review approved, but smart key provisioning failed:', accessError.message);
      }
    } else {
      booking.status = 'pending';
      await booking.save();
    }

    return res.status(200).json({
      status: 'success',
      message: normalizedDecision === 'approved'
        ? 'Identity verification approved manually.'
        : 'Identity verification rejected. Front desk verification is still required.',
      data: {
        bookingId: booking._id,
        bookingStatus: booking.status,
        identityVerification: booking.identityVerification,
        verificationSession: session,
        smartKeyAccess: smartKeyData
      }
    });
  } catch (error) {
    console.error('Error reviewing identity verification:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to review identity verification' });
  }
};

export const cleanupIdentityVerification = async (req, res) => {
  try {
    const { hotelId, bookingId } = req.params;
    const booking = await findHotelBooking(hotelId, bookingId);

    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const session = await IdentityVerificationSession.findOne({ hotel: hotelId, booking: bookingId }).sort({ createdAt: -1 });

    if (session) {
      const cleanup = await cleanupPendingContactlessBooking({
        hotelId,
        booking,
        session,
        reason: 'Identity verification session cancelled by guest before completion.',
        cleanupMode: 'cancelled'
      });

      return res.status(200).json({
        status: 'success',
        message: cleanup.removed
          ? 'Pending self check-in booking and identity session were cleaned up successfully.'
          : 'Identity verification session was cancelled.',
        data: {
          bookingId,
          removed: cleanup.removed,
          mode: cleanup.mode
        }
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Identity verification session was cancelled.',
      data: {
        bookingId,
        removed: false
      }
    });
  } catch (error) {
    console.error('Error cleaning up identity verification session:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to clean up identity verification session' });
  }
};

export const streamIdentityVerificationStatus = async (req, res) => {
  const { hotelId, bookingId } = req.params;
  const token = String(req.query.token || '').trim();

  // Basic validation before starting SSE
  const booking = await findHotelBooking(hotelId, bookingId);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found' });
  }

  const session = await IdentityVerificationSession.findOne({ hotel: hotelId, booking: bookingId }).sort({ createdAt: -1 });
  if (!session) {
    return res.status(404).json({ status: 'error', message: 'Identity verification session not found' });
  }

  if (token && session.qrSession?.token && session.qrSession.token !== token) {
    return res.status(403).json({ status: 'error', message: 'Invalid mobile identity session token' });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  registerIdentitySseStream(bookingId, res);

  req.on('close', () => {
    unregisterIdentitySseStream(bookingId, res);
  });
};
