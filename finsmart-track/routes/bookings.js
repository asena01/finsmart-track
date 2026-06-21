import express from 'express';
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  updatePaymentStatus,
  addRoomServiceOrder,
  updateRoomServiceOrder
} from '../controllers/bookingsController.js';
import {
  cleanupIdentityVerification,
  createContactlessBooking,
  createIdentityMobileSession,
  createDiditSession,
  getIdentityVerificationSession,
  reviewIdentityVerification,
  submitIdentityVerification,
  streamIdentityVerificationStatus
} from '../controllers/bookingIdentityController.js';

const router = express.Router({ mergeParams: true });

router.get('/:bookingId/identity', getIdentityVerificationSession);
router.get('/:bookingId/identity/stream', streamIdentityVerificationStatus);
router.post('/:bookingId/identity/session', createIdentityMobileSession);
router.post('/:bookingId/identity/didit-session', createDiditSession);
router.post('/:bookingId/identity/submit', submitIdentityVerification);
router.put('/:bookingId/identity/review', reviewIdentityVerification);
router.delete('/:bookingId/identity', cleanupIdentityVerification);

// GET all bookings
router.get('/', getAllBookings);

// GET booking by ID
router.get('/:id', getBookingById);

// POST create booking with auto-confirmation (contactless check-in)
router.post('/auto-confirm', createContactlessBooking);

// POST create booking
router.post('/', createBooking);

// PUT update booking
router.put('/:id', updateBooking);

// PUT update booking status
router.put('/:id/status', updateBookingStatus);

// PUT update payment status
router.put('/:id/payment-status', updatePaymentStatus);

// DELETE booking
router.delete('/:id', deleteBooking);

// POST add room service order
router.post('/:bookingId/room-service-orders', addRoomServiceOrder);

// PUT update room service order
router.put('/:bookingId/room-service-orders/:orderId', updateRoomServiceOrder);

export default router;
