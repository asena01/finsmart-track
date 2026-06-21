import express from 'express';
import {
  getAllPreCheckins,
  getCheckInStats,
  createPreCheckin,
  verifyIdentity,
  completeCheckIn,
  getPreCheckinById,
  deletePreCheckin
} from '../controllers/preCheckinController.js';

const router = express.Router({ mergeParams: true });

// Get all pre-checkins
router.get('/', getAllPreCheckins);

// Get check-in statistics
router.get('/stats', getCheckInStats);

// Create new pre-checkin
router.post('/', createPreCheckin);

// Get pre-checkin by ID
router.get('/:id', getPreCheckinById);

// Verify guest identity
router.put('/:id/verify', verifyIdentity);

// Complete check-in
router.put('/:id/complete', completeCheckIn);

// Delete pre-checkin
router.delete('/:id', deletePreCheckin);

export default router;
