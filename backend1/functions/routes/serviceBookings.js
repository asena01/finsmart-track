import express from 'express';
import {
  createServiceBooking,
  getBookingDetails,
  getCustomerBookings,
  getAllBookings,
  updateBookingStatus,
  cancelBooking,
  verifyPayment,
  rateService
} from '../controllers/serviceBookingsController.js';

const router = express.Router();

router.post('/', createServiceBooking);
router.post('/verify', verifyPayment);
router.get('/customer/:customerId', getCustomerBookings);
router.get('/:bookingId', getBookingDetails);
router.get('/', getAllBookings);
router.put('/:bookingId/status', updateBookingStatus);
router.put('/:bookingId/cancel', cancelBooking);
router.put('/:bookingId/rate', rateService);

export default router;
