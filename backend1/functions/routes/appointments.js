import express from 'express';
import {
  getAllBookings,
  getBookingDetails,
  createServiceBooking,
  updateBookingStatus,
  cancelBooking,
  rateService,
  assignStaffToBooking,
  deleteBooking
} from '../controllers/serviceBookingsController.js';

const router = express.Router();

// ============================================
// APPOINTMENTS ROUTES
// Maps /appointments/* to /service-bookings/* internally
// ============================================

// GET all appointments (with optional filters)
router.get('/', async (req, res, next) => {
  getAllBookings(req, res);
});

// GET single appointment by ID
router.get('/:appointmentId', async (req, res, next) => {
  req.params.bookingId = req.params.appointmentId;
  getBookingDetails(req, res);
});

// POST create new appointment
router.post('/', async (req, res, next) => {
  createServiceBooking(req, res);
});

// PUT update appointment (generic update)
router.put('/:appointmentId', async (req, res, next) => {
  req.params.bookingId = req.params.appointmentId;
  // For now, just update status as a generic update
  updateBookingStatus(req, res);
});

// PUT update appointment status
router.put('/:appointmentId/status', async (req, res, next) => {
  req.params.bookingId = req.params.appointmentId;
  updateBookingStatus(req, res);
});

// PUT cancel appointment
router.put('/:appointmentId/cancel', async (req, res, next) => {
  req.params.bookingId = req.params.appointmentId;
  cancelBooking(req, res);
});

// DELETE appointment
router.delete('/:appointmentId', async (req, res, next) => {
  req.params.bookingId = req.params.appointmentId;
  deleteBooking(req, res);
});

// PUT assign staff to appointment
router.put('/:appointmentId/assign-staff', async (req, res, next) => {
  req.params.bookingId = req.params.appointmentId;
  assignStaffToBooking(req, res);
});

// GET available time slots for a service
router.get('/available-slots', async (req, res, next) => {
  try {
    const { providerId, serviceId, date } = req.query;

    if (!providerId || !serviceId || !date) {
      return res.status(400).json({
        status: 'error',
        message: 'providerId, serviceId, and date are required'
      });
    }

    // Get the database from app locals
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({
        status: 'error',
        message: 'Database not initialized'
      });
    }

    // Get all staff for the provider
    const staffCollection = db.collection('service-staff');
    const staff = await staffCollection
      .find({ providerId: providerId.toString() })
      .toArray();

    // Get all bookings for this service on the given date
    const ServiceBooking = req.app.locals.ServiceBooking;
    if (!ServiceBooking) {
      // Return default slots if model not available
      const defaultSlots = generateDefaultSlots();
      return res.status(200).json({
        status: 'success',
        data: defaultSlots,
        date,
        providerId,
        serviceId,
        staffAvailable: staff.length
      });
    }

    const bookingCollection = db.collection('servicebookings');
    const bookingsOnDate = await bookingCollection
      .find({
        serviceProvider: providerId,
        bookingDate: date
      })
      .toArray();

    // Generate available slots based on staff and bookings
    const availableSlots = generateAvailableSlotsWithStaff(
      staff,
      bookingsOnDate,
      date
    );

    return res.status(200).json({
      status: 'success',
      data: availableSlots,
      date,
      providerId,
      serviceId,
      staffAvailable: staff.filter(s => s.status === 'active').length
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: []
    });
  }
});

/**
 * Generate default time slots
 */
function generateDefaultSlots() {
  return [
    { startTime: '09:00', endTime: '09:30', available: 1 },
    { startTime: '09:30', endTime: '10:00', available: 1 },
    { startTime: '10:00', endTime: '10:30', available: 2 },
    { startTime: '10:30', endTime: '11:00', available: 1 },
    { startTime: '14:00', endTime: '14:30', available: 2 },
    { startTime: '14:30', endTime: '15:00', available: 1 },
    { startTime: '15:00', endTime: '15:30', available: 1 },
  ];
}

/**
 * Generate available slots based on staff and bookings
 */
function generateAvailableSlotsWithStaff(staff, bookings, date) {
  const slots = [];
  const businessHours = [
    { hour: 9, minutes: [0, 30] },
    { hour: 10, minutes: [0, 30] },
    { hour: 11, minutes: [0, 30] },
    { hour: 14, minutes: [0, 30] },
    { hour: 15, minutes: [0, 30] },
    { hour: 16, minutes: [0, 30] }
  ];

  const activeStaffCount = staff.filter(s => s.status === 'active').length;

  businessHours.forEach(timeBlock => {
    const startTime = `${String(timeBlock.hour).padStart(2, '0')}:${String(timeBlock.minutes[0]).padStart(2, '0')}`;
    const endTime = `${String(timeBlock.hour).padStart(2, '0')}:${String(timeBlock.minutes[1]).padStart(2, '0')}`;

    // Count bookings for this time slot
    const bookingsInSlot = bookings.filter(booking => {
      const bookingStart = booking.startTime || '00:00';
      const bookingEnd = booking.endTime || '00:00';
      return bookingStart <= startTime && bookingEnd > startTime;
    }).length;

    const availableCount = Math.max(0, activeStaffCount - bookingsInSlot);

    slots.push({
      startTime,
      endTime,
      available: availableCount,
      staffAvailable: activeStaffCount,
      booked: bookingsInSlot
    });
  });

  return slots;
}

// PUT rate service (same as rate endpoint in service bookings)
router.put('/:appointmentId/rate', async (req, res, next) => {
  req.params.bookingId = req.params.appointmentId;
  rateService(req, res);
});

export default router;
