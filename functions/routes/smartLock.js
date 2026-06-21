import express from 'express';
import {
  createSmartLockAccess,
  unlockRoom,
  unlockWithPin,
  getBookingSmartLockAccess,
  getUnlockHistory,
  revokeSmartLockAccess
} from '../controllers/smartLockController.js';

const router = express.Router();

/**
 * Create smart lock access for a confirmed booking
 * POST /smart-lock/create-access/:bookingId
 */
router.post('/create-access/:bookingId', createSmartLockAccess);

/**
 * Unlock room using access token
 * POST /smart-lock/unlock
 * Body: { accessToken: string }
 */
router.post('/unlock', unlockRoom);

/**
 * Unlock room using backup PIN
 * POST /smart-lock/unlock-with-pin
 * Body: { backupPin: string, bookingNumber: string }
 */
router.post('/unlock-with-pin', unlockWithPin);

/**
 * Get smart lock access state for a booking
 * GET /smart-lock/access/:bookingId
 */
router.get('/access/:bookingId', getBookingSmartLockAccess);

/**
 * Get unlock attempt history for a booking
 * GET /smart-lock/history/:bookingId
 */
router.get('/history/:bookingId', getUnlockHistory);

/**
 * Revoke smart lock access for a booking
 * POST /smart-lock/revoke/:bookingId
 */
router.post('/revoke/:bookingId', revokeSmartLockAccess);

export default router;
