import crypto from 'crypto';

const DEFAULT_QR_TTL_MINUTES = 60;
const FACE_MATCH_THRESHOLD = 85;
const LIVENESS_THRESHOLD = 80;

const safeString = (value = '') => String(value || '').trim();
const safeNumber = (value) => Number(value || 0);

const formatMrzDate = (mrzDate) => {
  if (!mrzDate || typeof mrzDate !== 'string' || mrzDate.length !== 6) return mrzDate;
  try {
    const yearPart = parseInt(mrzDate.slice(0, 2), 10);
    const month = mrzDate.slice(2, 4);
    const day = mrzDate.slice(4, 6);
    
    // Standard MRZ date logic:
    // If year > (currentYear - 2000), it's probably 19xx
    // e.g. 78 -> 1978. 23 -> 2023.
    const currentYearShort = new Date().getFullYear() % 100;
    const fullYear = yearPart > currentYearShort + 5 ? `19${yearPart}` : `20${String(yearPart).padStart(2, '0')}`;
    
    return `${fullYear}-${month}-${day}`;
  } catch (e) {
    return mrzDate;
  }
};

const createBookingReference = (booking) => {
  if (safeString(booking?.bookingNumber)) {
    return safeString(booking.bookingNumber);
  }

  const hotelPrefix = safeString(booking?.hotel?.name || booking?.hotelName || 'HOTL')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  const roomSuffix = safeString(booking?.room?._id || booking?.room || 'ROOM').slice(-4).toUpperCase();
  const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');

  return `${hotelPrefix}-${dateCode}-${roomSuffix}`;
};

const normalizeCheckStatus = (value, approved) => {
  if (value === 'passed') return 'passed';
  if (value === 'failed') return 'failed';
  if (value === 'manual_review' || value === 'manual-review') return 'manual_review';
  return approved ? 'passed' : 'manual_review';
};

export const createIdentityVerificationProvider = () => {
  return {
    get name() {
      return safeString(process.env.IDENTITY_PROVIDER).toLowerCase() || 'mock';
    },

    createMobileSession({ hotelId, bookingId, bookingReference, baseUrl }) {
      const token = crypto.randomBytes(18).toString('hex');
      const expiresAt = new Date(Date.now() + DEFAULT_QR_TTL_MINUTES * 60 * 1000);
      const resolvedBaseUrl = safeString(baseUrl) || process.env.IDENTITY_MOBILE_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:4200';

      return {
        token,
        url: `${resolvedBaseUrl.replace(/\/$/, '')}/mobile-checkin/${hotelId}/${bookingId}?token=${token}`,
        expiresAt,
        source: 'mobile',
        bookingReference: safeString(bookingReference)
      };
    },

    async createDiditSession({ booking, vendorData, callbackUrl }) {
      const apiKey = safeString(process.env.DIDIT_API_KEY || 'didit_mock_key');
      const workflowId = safeString(process.env.DIDIT_WORKFLOW_ID);

      if (process.env.NODE_ENV === 'development' && (apiKey === 'didit_mock_key' || !workflowId)) {
        console.log('ℹ️ Using mock Didit session (API Key or Workflow ID missing)');
        // Return a mock Didit session for development if key or workflow ID is missing
        return {
          session_id: `mock-didit-${crypto.randomBytes(8).toString('hex')}`,
          url: 'https://demo.didit.me/mock-session',
          status: 'Not Started'
        };
      }

      if (!workflowId) {
        throw new Error('DIDIT_WORKFLOW_ID is required for production Didit sessions');
      }

      try {
        const response = await fetch('https://verification.didit.me/v3/session/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({
            workflow_id: workflowId,
            vendor_data: vendorData || booking?._id?.toString(),
            callback: callbackUrl,
            metadata: {
              booking_id: booking?._id,
              booking_number: booking?.bookingNumber
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Didit API error: ${response.statusText} ${JSON.stringify(errorData)}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Failed to create Didit session:', error);
        throw error;
      }
    },

    async getDiditSession(sessionId) {
      const apiKey = safeString(process.env.DIDIT_API_KEY || 'didit_mock_key');

      if (process.env.NODE_ENV === 'development' && apiKey === 'didit_mock_key' && sessionId.startsWith('mock-didit')) {
        return {
          session_id: sessionId,
          status: 'Completed',
          decision: 'Approved'
        };
      }

      try {
        console.log(`🔍 Fetching Didit session decision: ${sessionId}`);
        // v3 uses /session/{id}/decision/ for results
        const response = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'x-api-key': apiKey
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Didit API error (${response.status}) for session ${sessionId}:`, errorText);
          throw new Error(`Didit API error: ${response.status} ${response.statusText} - ${errorText.slice(0, 200)}`);
        }

        const data = await response.json();
        console.log(`✅ Didit session decision retrieved successfully for ${sessionId}. Status: ${data.status}`);
        return data;
      } catch (error) {
        console.error('❌ Failed to retrieve Didit session:', error.message);
        throw error;
      }
    },

    async evaluateIdentityVerification({ booking, identityPayload, existingSession }) {
      const payload = identityPayload || {};
      
      // Force 'didit' if we have an external session ID or if the global provider is 'didit'
      // We want to avoid being stuck on 'mock' just because the booking was created while mock was enabled
      let provider = this.name;
      if (payload.externalSessionId || existingSession?.externalSessionId || payload.provider === 'didit' || existingSession?.provider === 'didit') {
        provider = 'didit';
      } else if (payload.provider) {
        provider = payload.provider;
      }

      console.log(`[DEBUG_LOG] evaluateIdentityVerification: Provider=${provider}, BookingId=${booking?._id}, SessionId=${payload.externalSessionId || existingSession?.externalSessionId}`);

      // Handle Didit provider
      if (provider === 'didit' && (payload.externalSessionId || existingSession?.externalSessionId)) {
        const sessionId = String(payload.externalSessionId || existingSession?.externalSessionId || '').replace(/[{}]/g, '');
        
        try {
          console.log(`[DEBUG_LOG] Refreshing Didit session: ${sessionId}`);
          const diditSession = await this.getDiditSession(sessionId);
          
          // v3 decision status parsing - case insensitive
          const rawStatus = safeString(diditSession.status);
          const statusLower = rawStatus.toLowerCase();
          const approved = statusLower === 'approved' || statusLower === 'completed';
          const rejected = statusLower === 'declined' || statusLower === 'rejected' || statusLower === 'failed';
          
          console.log(`[DEBUG_LOG] Didit status: ${rawStatus} (Approved: ${approved}, Rejected: ${rejected})`);
          
          // Capture more data from Didit session - V3 plural arrays support
          const idVerifications = diditSession.id_verifications || [];
          const livenessChecks = diditSession.liveness_checks || [];
          const faceMatches = diditSession.face_matches || [];
          const amlScreenings = diditSession.aml_screenings || [];
          const ipAnalyses = diditSession.ip_analyses || [];
          
          const mainIdVer = idVerifications[0] || {};
          const mainLiveness = livenessChecks[0] || {};
          const mainFaceMatch = faceMatches[0] || {};
          const mainAml = amlScreenings[0] || {};
          const mainIp = ipAnalyses[0] || {};
          
          const mrz = mainIdVer.mrz || {};
          
          const images = {
            front: mainIdVer.full_front_image || mainIdVer.front_image || '',
            back: mainIdVer.full_back_image || mainIdVer.back_image || '',
            portrait: mainIdVer.portrait_image || mainFaceMatch.target_image || mainLiveness.reference_image || ''
          };

          // Extract specific failure reason from Didit warnings if any
          let failureReason = approved ? '' : (rejected ? 'Verification was declined by the automated system.' : 'Verification is currently in review or requires manual staff check.');
          
          // Combine all warnings for clarity
          const allWarnings = [
            ...(mainIdVer.warnings || []),
            ...(mainLiveness.warnings || []),
            ...(mainFaceMatch.warnings || []),
            ...(mainIp.warnings || [])
          ];

          if (!approved && allWarnings.length > 0) {
            // Join all unique warnings for a fuller picture
            const warningDescriptions = allWarnings
              .map(w => w.long_description || w.short_description)
              .filter((val, index, self) => val && self.indexOf(val) === index);
            
            if (warningDescriptions.length > 0) {
              failureReason = warningDescriptions.join(' | ');
            }
          }
          
          return {
            provider: 'didit',
            bookingReference: payload.bookingReference || existingSession?.bookingReference || createBookingReference(booking),
            status: approved ? 'verified' : (rejected ? 'rejected' : 'manual_review'),
            approved,
            fallbackRequired: !approved,
            submittedAt: diditSession.created_at ? new Date(diditSession.created_at) : new Date(),
            completedAt: new Date(),
            failureReason,
            extractedIdentity: {
              fullName: mainIdVer.full_name || 
                        (mainIdVer.first_name ? `${mainIdVer.first_name} ${mainIdVer.last_name || ''}`.trim() : '') || 
                        (mrz.name ? `${mrz.name} ${mrz.surname || ''}`.trim() : '') ||
                        payload.fullName,
              dateOfBirth: mainIdVer.date_of_birth || formatMrzDate(mrz.birth_date) || payload.dateOfBirth,
              documentNumber: mainIdVer.document_number || mainIdVer.personal_number || mrz.document_number,
              nationality: mainIdVer.nationality || mrz.nationality,
              issuingCountry: mainIdVer.issuing_state_name || mainIdVer.issuing_state || mrz.country,
              expirationDate: mainIdVer.expiration_date || formatMrzDate(mrz.expiry_date),
              address: mainIdVer.formatted_address || mainIdVer.address,
              gender: mainIdVer.gender || mrz.sex,
              issuingState: mainIdVer.issuing_state_name || mainIdVer.issuing_state || mrz.country,
              placeOfBirth: mainIdVer.place_of_birth
            },
            document: {
              idType: mainIdVer.document_type || mrz.document_type || payload.idType || 'passport',
              idNumber: mainIdVer.document_number || mainIdVer.personal_number || mrz.document_number,
              idFrontImage: images.front,
              idBackImage: images.back,
              faceImage: images.portrait,
              externalSessionId: sessionId,
              issuingCountry: mainIdVer.issuing_state_name || mainIdVer.issuing_state || mrz.country
            },
            checks: {
              ocr: { 
                status: normalizeCheckStatus(mainIdVer.status?.toLowerCase(), mainIdVer.status === 'Approved'),
                extractedName: mainIdVer.full_name || (mainIdVer.first_name ? `${mainIdVer.first_name} ${mainIdVer.last_name || ''}`.trim() : '') || (mrz.name ? `${mrz.name} ${mrz.surname || ''}`.trim() : ''),
                extractedDob: mainIdVer.date_of_birth || formatMrzDate(mrz.birth_date),
                confidence: mainIdVer.front_image_quality_score?.overall_score ? (mainIdVer.front_image_quality_score.overall_score / 100) : 0.99
              },
              faceMatch: { 
                status: normalizeCheckStatus(mainFaceMatch.status?.toLowerCase(), mainFaceMatch.status === 'Approved'),
                score: mainFaceMatch.score || (mainFaceMatch.status === 'Approved' ? 95 : 0),
                threshold: FACE_MATCH_THRESHOLD
              },
              liveness: { 
                status: normalizeCheckStatus(mainLiveness.status?.toLowerCase(), mainLiveness.status === 'Approved'),
                score: mainLiveness.score || (mainLiveness.status === 'Approved' ? 98 : 0),
                threshold: LIVENESS_THRESHOLD,
                videoUrl: mainLiveness.video_url
              },
              aml: {
                status: mainAml.status ? normalizeCheckStatus(mainAml.status.toLowerCase(), mainAml.status === 'Approved') : 'pending',
                score: (mainAml.status === 'Approved' ? 100 : 0),
                threshold: 80,
                riskScore: mainAml.risk_score
              },
              ip: {
                status: mainIp.status ? normalizeCheckStatus(mainIp.status.toLowerCase(), mainIp.status === 'Approved') : 'pending',
                score: (mainIp.is_vpn_or_tor || mainIp.is_data_center) ? 20 : 100,
                threshold: 80,
                ipAddress: mainIp.ip_address,
                location: mainIp.ip_city && mainIp.ip_country ? `${mainIp.ip_city}, ${mainIp.ip_country}` : (mainIp.ip_country || mainIp.ip_city),
                isProxy: mainIp.is_vpn_or_tor || mainIp.is_data_center
              }
            },
            rawPayload: {
              ...payload,
              diditSession: diditSession,
              amlStatus: mainAml.status,
              ipAnalysis: mainIp
            }
          };
        } catch (error) {
          console.warn('Failed to verify Didit session during evaluation, using existing data:', error.message);
          // If API call fails, we return what we know from existing session if available
          if (existingSession || payload.externalSessionId) {
            return {
              provider: 'didit',
              bookingReference: payload.bookingReference || existingSession?.bookingReference || createBookingReference(booking),
              status: existingSession?.status || 'manual_review',
              approved: existingSession?.status === 'verified',
              fallbackRequired: true,
              submittedAt: existingSession?.submittedAt || new Date(),
              completedAt: existingSession?.completedAt,
              failureReason: `Unable to refresh Didit status: ${error.message}`,
              extractedIdentity: existingSession?.extractedIdentity || {},
              document: existingSession?.document || { externalSessionId: sessionId },
              checks: existingSession?.checks || {
                ocr: { status: 'manual_review' },
                faceMatch: { status: 'manual_review' },
                liveness: { status: 'manual_review' }
              },
              rawPayload: payload
            };
          }
        }
      }

      // If we are explicitly using didit but no session id yet, return pending
      if (provider === 'didit' && !payload.externalSessionId && !existingSession?.externalSessionId) {
        return {
          provider: 'didit',
          status: 'pending',
          approved: false,
          fallbackRequired: false,
          bookingReference: payload.bookingReference || existingSession?.bookingReference || createBookingReference(booking)
        };
      }

      const bookingReference = safeString(payload.bookingReference || existingSession?.bookingReference || createBookingReference(booking));

      const isBase64Data = (str) => typeof str === 'string' && str.startsWith('data:');
      const isImageTooSmall = (str) => !str || str.length < 15000;
      const isVideoTooSmall = (str) => !str || str.length < 50000;
      const isSuspicious = (filename) => /random|test|sample|dummy|garbage|trash|temp|tmp|download|placeholder/i.test(safeString(filename));

      const hasPassportImage = Boolean(
        (payload.passportImage && isBase64Data(payload.passportImage) && !isImageTooSmall(payload.passportImage)) ||
        (payload.document?.passportImage && isBase64Data(payload.document.passportImage) && !isImageTooSmall(payload.document.passportImage)) ||
        (existingSession?.document?.passportImage && isBase64Data(existingSession.document.passportImage) && !isImageTooSmall(existingSession.document.passportImage))
      );

      const hasSelfieVideo = Boolean(
        (payload.selfieVideo && isBase64Data(payload.selfieVideo) && !isVideoTooSmall(payload.selfieVideo)) ||
        (payload.selfieVideoName && payload.selfieVideoName.length > 0 && !payload.selfieVideo && existingSession?.qrSession?.completedAt) ||
        (existingSession?.document?.selfieVideo && isBase64Data(existingSession.document.selfieVideo) && !isVideoTooSmall(existingSession.document.selfieVideo))
      );
      
      const hasSelfieWithId = Boolean(
        (payload.selfieWithIdImage && isBase64Data(payload.selfieWithIdImage) && !isImageTooSmall(payload.selfieWithIdImage)) ||
        (existingSession?.document?.selfieWithIdImage && isBase64Data(existingSession.document.selfieWithIdImage) && !isImageTooSmall(existingSession.document.selfieWithIdImage))
      );

      const suspiciousUpload = isSuspicious(payload.passportImageName) || 
                               isSuspicious(payload.selfieVideoName) || 
                               isSuspicious(payload.selfieWithIdImageName) ||
                               isSuspicious(payload.document?.passportImageName) ||
                               isSuspicious(payload.document?.selfieVideoName) ||
                               isSuspicious(existingSession?.document?.passportImageName) ||
                               isSuspicious(existingSession?.document?.selfieVideoName);

      const dataConcern = (payload.passportImage && isImageTooSmall(payload.passportImage)) ||
                          (payload.selfieVideo && isVideoTooSmall(payload.selfieVideo)) ||
                          (payload.selfieWithIdImage && isImageTooSmall(payload.selfieWithIdImage));

      const extractedName = (suspiciousUpload || dataConcern)
        ? 'Invalid / Suspicious Identity'
        : safeString(
            payload.extractedName ||
            payload.ocr?.extractedName ||
            payload.fullName ||
            existingSession?.extractedIdentity?.fullName ||
            booking?.guest?.name
          ) || 'Identity Verification Pending';

      const extractedDob = (suspiciousUpload || dataConcern)
        ? '1900-01-01'
        : safeString(
            payload.extractedDob ||
            payload.dateOfBirth ||
            payload.ocr?.extractedDob ||
            existingSession?.extractedIdentity?.dateOfBirth
          ) || (booking?.guest?.dateOfBirth ? new Date(booking.guest.dateOfBirth).toISOString().split('T')[0] : '1990-01-01');

      const guestName = safeString(booking?.guest?.name || '').toLowerCase();
      const inputName = extractedName.toLowerCase();
      const nameMatch = !guestName || 
                        inputName.includes(guestName) || 
                        guestName.includes(inputName) ||
                        guestName.split(' ').some(part => part.length > 2 && inputName.includes(part));

      const idNumber = safeString(payload.idNumber || existingSession?.document?.idNumber);
      const idValid = idNumber.length >= 5;

      // Deterministic seed for mock scores
      const getSeed = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash);
      };
      const seed = getSeed(bookingReference + (existingSession?._id || 'mock-id'));

      // Only give mock scores if some data was actually provided, otherwise fail
      let faceScore = 0;
      if (hasPassportImage && (hasSelfieVideo || payload.selfieVideo)) {
        if (suspiciousUpload || dataConcern) {
          faceScore = 20 + (seed % 20);
        } else {
          faceScore = Number(payload.faceMatch?.score ?? (nameMatch ? (86 + (seed % 8)) : (65 + (seed % 15))));
          // Deterministic small failure rate for realism
          if (seed % 41 === 0) faceScore = 79;
        }
      }

      let livenessScore = 0;
      if (hasSelfieVideo || payload.selfieVideo) {
        if (suspiciousUpload || dataConcern) {
          livenessScore = 15 + (seed % 25);
        } else {
          livenessScore = Number(payload.liveness?.score ?? ((payload.usedMobileQr ? 92 : 75) + (seed % 6)));
          // Deterministic small failure rate for realism
          if (seed % 47 === 0) livenessScore = 72;
        }
      }

      const faceApproved = faceScore >= FACE_MATCH_THRESHOLD;
      const livenessApproved = livenessScore >= LIVENESS_THRESHOLD;
      const explicitFallback = payload.fallbackRequired === true || payload.verified === false;

      const missingInputs = !hasPassportImage || !hasSelfieVideo || !hasSelfieWithId || !idValid;
      const approved = !explicitFallback && !missingInputs && faceApproved && livenessApproved && !dataConcern && !suspiciousUpload && nameMatch;

      const status = approved ? 'verified' : 'manual_review';

      return {
        provider: this.name,
        bookingReference,
        status,
        approved,
        fallbackRequired: !approved,
        submittedAt: new Date(),
        completedAt: new Date(),
        failureReason: approved
          ? ''
          : (suspiciousUpload || dataConcern
              ? 'The uploaded images or video files appear to be invalid or contain suspicious content. Please provide clear, authentic captures of your identity document and a live selfie.'
              : (!idValid
                  ? 'The provided identity document number is invalid or too short. Please provide a valid passport or ID number.'
                  : (!nameMatch
                      ? 'The name on the identity document does not appear to match the guest name on the booking. Manual review is required.'
                      : (missingInputs
                          ? 'Identity verification is incomplete. Passport capture, selfie video, and a photo of you holding your ID are required before digital access can be approved.'
                          : 'One or more automated checks fell below threshold. Manual hotel review is required before self check-in can be approved.')))),
        extractedIdentity: {
          fullName: extractedName,
          dateOfBirth: extractedDob
        },
        document: {
          idType: payload.idType || 'passport',
          idNumber: idNumber,
          passportImageName: safeString(payload.passportImageName || existingSession?.document?.passportImageName),
          passportImage: payload.passportImage || existingSession?.document?.passportImage || '',
          selfieVideoName: safeString(payload.selfieVideoName || existingSession?.document?.selfieVideoName),
          selfieVideo: payload.selfieVideo || existingSession?.document?.selfieVideo || '',
          selfieWithIdImageName: safeString(payload.selfieWithIdImageName || existingSession?.document?.selfieWithIdImageName),
          selfieWithIdImage: payload.selfieWithIdImage || existingSession?.document?.selfieWithIdImage || ''
        },
        checks: {
          ocr: {
            status: normalizeCheckStatus(payload.ocr?.status, approved && hasPassportImage && !suspiciousUpload),
            extractedName,
            extractedDob,
            confidence: Number(payload.ocr?.confidence ?? (suspiciousUpload || dataConcern ? 0.15 : 0.92))
          },
          faceMatch: {
            status: normalizeCheckStatus(payload.faceMatch?.status, faceApproved),
            score: faceScore,
            threshold: FACE_MATCH_THRESHOLD
          },
          liveness: {
            status: normalizeCheckStatus(payload.liveness?.status, livenessApproved),
            score: livenessScore,
            threshold: LIVENESS_THRESHOLD
          },
          aml: {
            status: approved ? 'passed' : 'manual_review',
            score: approved ? 100 : 65,
            threshold: 80,
            riskScore: approved ? 0 : 25
          },
          ip: {
            status: approved ? 'passed' : 'manual_review',
            score: approved ? 100 : 45,
            threshold: 80,
            ipAddress: '127.0.0.1',
            location: 'Localhost, Dev',
            isProxy: false
          }
        },
        rawPayload: payload
      };
    }
  };
};

export const identityVerificationProvider = createIdentityVerificationProvider();
export { createBookingReference };
