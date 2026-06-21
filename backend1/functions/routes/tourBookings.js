import express from 'express';
import {
  createTourBooking,
  getBookingDetails,
  getCustomerBookings,
  getAllBookings,
  cancelBooking,
  updateBookingStatus,
  verifyPayment
} from '../controllers/tourBookingsController.js';

const router = express.Router();

// Public endpoints
router.post('/', createTourBooking);
router.post('/verify', verifyPayment);
router.get('/customer/:customerId', getCustomerBookings);
router.get('/:bookingId', getBookingDetails);

// Admin endpoints
router.get('/', getAllBookings);

// Update endpoints
router.put('/:bookingId/status', updateBookingStatus);
router.put('/:bookingId/cancel', cancelBooking);

export default router;
