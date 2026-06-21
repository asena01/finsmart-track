import express from 'express';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import mongoose from 'mongoose';
import { syncExpiredBookings } from '../controllers/bookingsController.js';
import {
  getDeviceStatus,
  getDeviceLogs,
  getDeviceBellStream,
  getDeviceRemoteUnlockRequestStatus,
  remoteUnlockDevice,
  approveDeviceRemoteUnlock,
  rejectDeviceRemoteUnlock,
  getDeviceShadowProperties
} from '../controllers/deviceController.js';
import { buildIncomeReportData } from '../controllers/revenueController.js';

const router = express.Router();

const syncHotelRating = async (hotelId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(hotelId),
        businessType: 'hotel',
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const averageRating = stats[0]?.averageRating || 0;
  const totalReviews = stats[0]?.totalReviews || 0;

  await Hotel.findByIdAndUpdate(hotelId, {
    rating: Number(averageRating.toFixed(1)),
    reviewsCount: totalReviews
  });
};

// ==================== CHECK ROOM AVAILABILITY ====================
// MUST BE DEFINED BEFORE GENERIC /:id ROUTE
// Check if a room is available for a specific date range
router.get('/check-availability/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { checkInDate, checkOutDate } = req.query;

    // Validate input
    if (!roomId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters',
        data: null
      });
    }

    // Parse and validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkIn >= checkOut) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date range',
        data: null
      });
    }

    // Calculate number of nights
    const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Verify room exists
    const room = await Room.findById(roomId).populate('hotel', 'name');
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found',
        data: null
      });
    }

    // Check for conflicting bookings
    const conflictingBookings = await Booking.countDocuments({
      room: roomId,
      status: { $in: ['confirmed', 'checked-in'] },
      $or: [
        {
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gt: checkIn }
        }
      ]
    });

    const isAvailable = conflictingBookings === 0;

    res.status(200).json({
      status: 'success',
      data: {
        roomId,
        isAvailable,
        numberOfNights,
        conflictingBookings,
        message: isAvailable
          ? `Room is available for ${numberOfNights} night(s)`
          : `Room is already booked for these dates`
      }
    });
  } catch (err) {
    console.error('Availability check error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check availability',
      data: { isAvailable: true, numberOfNights: 1 }  // Return available on error as fallback
    });
  }
});

// ==================== PUBLIC SEARCH ENDPOINT ====================
// MUST BE DEFINED BEFORE GENERIC /:id ROUTE
// Search public hotels (for customers browsing available hotels)
router.get('/public/search', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      location,
      checkIn,
      checkOut,
      guests,
      minRating = 0,
      amenities,
      propertyTypes
    } = req.query;

    console.log('🔍 Public hotel search requested:', { page, limit, location, checkIn, checkOut, guests, minRating, amenities, propertyTypes });

    // Build filter for active hotels only
    let filter = { isActive: true };

    // Location filter (city or address)
    if (location) {
      filter.$or = [
        { city: { $regex: location, $options: 'i' } },
        { address: { $regex: location, $options: 'i' } },
        { state: { $regex: location, $options: 'i' } },
        { country: { $regex: location, $options: 'i' } },
        { name: { $regex: location, $options: 'i' } }
      ];
    }

    // Rating filter
    if (minRating > 0) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    // Amenities filter
    if (amenities) {
      const amenityArray = typeof amenities === 'string' ? amenities.split(',') : [amenities];
      filter.amenities = { $in: amenityArray };
    }

    // Property type filter
    if (propertyTypes) {
      const typeArray = typeof propertyTypes === 'string' ? propertyTypes.split(',') : [propertyTypes];
      filter.type = { $in: typeArray };
    }

    // Pagination
    const skip = (page - 1) * limit;

    let checkInDate = null;
    let checkOutDate = null;
    const requestedGuests = Number(guests) || 0;
    const hasDateRange = Boolean(checkIn && checkOut);

    if (hasDateRange) {
      checkInDate = new Date(checkIn);
      checkOutDate = new Date(checkOut);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkInDate >= checkOutDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid check-in/check-out date range'
        });
      }
    }

    // Fetch hotels
    const hotels = await Hotel.find(filter)
      .populate('owner', 'name email phone')
      .limit(limit * 1)
      .skip(skip)
      .sort({ rating: -1, createdAt: -1 });

    const total = await Hotel.countDocuments(filter);

    console.log(`✅ Found ${hotels.length} hotels out of ${total} total`);

    // Transform data for frontend - fetch rooms and calculate price
    const transformedHotels = await Promise.all(
      hotels.map(async (hotel) => {
        // Fetch rooms for this hotel to get pricing and availability
        let rooms = await Room.find({ hotel: hotel._id });

        if (requestedGuests > 0) {
          rooms = rooms.filter((room) => (room.capacity || room.maxOccupancy || 0) >= requestedGuests);
        }

        if (hasDateRange && rooms.length > 0) {
          const roomIds = rooms.map((room) => room._id);
          const conflictingBookings = await Booking.find({
            room: { $in: roomIds },
            status: { $in: ['pending', 'confirmed', 'checked-in'] },
            checkInDate: { $lt: checkOutDate },
            checkOutDate: { $gt: checkInDate }
          }).select('room');

          const unavailableRoomIds = new Set(
            conflictingBookings.map((booking) => booking.room?.toString()).filter(Boolean)
          );

          rooms = rooms.filter((room) => !unavailableRoomIds.has(room._id.toString()));
        }

        rooms = rooms.filter((room) => room.status !== 'maintenance');

        // Calculate base price (minimum room price) or use existing basePrice
        let price = hotel.basePrice || 0;
        if (rooms.length > 0) {
          const minPrice = Math.min(...rooms.map(r => r.discountedPrice || r.pricePerNight));
          price = minPrice;
        }

        const hotelObj = hotel.toObject();

        const transformedHotel = {
          ...hotelObj,
          id: hotel._id,
          reviews: hotel.reviewsCount || 0,
          icon: '🏨',
          price,
          // CRITICAL: Ensure contactlessCheckInEnabled is always included
          // It must come AFTER spread to override any existing value
          contactlessCheckInEnabled: (hotel.contactlessCheckInEnabled === true),
          rooms: rooms.map(room => ({
            id: room._id,
            type: room.roomType,
            bedType: room.bedType || 'Standard',
            capacity: room.capacity,
            price: room.discountedPrice || room.pricePerNight,
            originalPrice: room.pricePerNight,
            maxGuests: room.capacity,
            status: room.status,
            amenities: room.amenities || [],
            rating: 4.0,
            reviews: 0,
            icon: '🛏️',
            images: room.images || []
          }))
        };

        console.log(`✅ ${hotel.name} - contactlessCheckInEnabled: ${transformedHotel.contactlessCheckInEnabled}`);
        return transformedHotel;
      })
    );

    console.log('📊 Transformed hotels:', transformedHotels.map(h => ({ name: h.name, contactlessCheckInEnabled: h.contactlessCheckInEnabled })));

    res.status(200).json({
      status: 'success',
      data: transformedHotels,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      }
    });
  } catch (err) {
    console.error('Error in public hotel search:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error', error: err.message });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const { id: hotelId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const reviews = await Review.find({
      businessId: hotelId,
      businessType: 'hotel',
      status: 'approved'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments({
      businessId: hotelId,
      businessType: 'hotel',
      status: 'approved'
    });

    const formattedReviews = reviews.map((review) => ({
      ...review.toObject(),
      guestName: review.customerName,
      response: review.vendorResponse?.text || null,
      responseDate: review.vendorResponse?.respondedAt || null,
    }));

    res.status(200).json({
      status: 'success',
      data: formattedReviews,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page)
      }
    });
  } catch (err) {
    console.error('Error fetching hotel reviews:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch hotel reviews' });
  }
});

router.post('/:id/reviews', async (req, res) => {
  try {
    const { id: hotelId } = req.params;
    const {
      bookingId,
      customerId,
      customerName,
      customerEmail,
      rating,
      title,
      comment
    } = req.body;

    if (!bookingId || !customerId || !customerName || !rating || !title || !comment) {
      return res.status(400).json({ status: 'failed', message: 'Missing required review fields' });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'roomNumber roomType');
    if (!booking) {
      return res.status(404).json({ status: 'failed', message: 'Booking not found' });
    }

    if (booking.hotel?.toString() !== hotelId) {
      return res.status(400).json({ status: 'failed', message: 'Booking does not belong to this hotel' });
    }

    if (booking.guest?.toString() !== customerId) {
      return res.status(403).json({ status: 'failed', message: 'You can only review your own stay' });
    }

    if (!['checked-out', 'completed'].includes(booking.status)) {
      return res.status(400).json({ status: 'failed', message: 'You can review only after checkout is completed' });
    }

    const existingReview = await Review.findOne({
      businessId: hotelId,
      businessType: 'hotel',
      bookingId,
      customerId
    });

    if (existingReview) {
      return res.status(409).json({ status: 'failed', message: 'You already reviewed this stay' });
    }

    const review = new Review({
      businessId: hotelId,
      businessType: 'hotel',
      customerId,
      customerName,
      customerEmail,
      bookingId,
      orderId: bookingId,
      productName: booking.room?.roomType || null,
      roomNumber: booking.room?.roomNumber || null,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      rating,
      title,
      comment,
      isVerifiedPurchase: true,
      status: 'approved'
    });

    await review.save();
    await syncHotelRating(hotelId);

    res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully',
      data: {
        ...review.toObject(),
        guestName: review.customerName,
        response: null,
        responseDate: null
      }
    });
  } catch (err) {
    console.error('Error creating hotel review:', err);
    res.status(500).json({ status: 'error', message: 'Failed to submit hotel review' });
  }
});

// Get all hotels
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    let filter = {};

    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const skip = (page - 1) * limit;
    const hotels = await Hotel.find(filter)
      .populate('owner', 'name email')
      .limit(limit * 1)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Hotel.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: hotels,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// Get hotel dashboard stats
// MUST BE DEFINED BEFORE GENERIC /:id ROUTE
router.get('/:id/stats', async (req, res) => {
  try {
    const { id: hotelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid hotel ID',
        data: null
      });
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [rooms, activeBookings, checkInsToday, report] = await Promise.all([
      Room.countDocuments({ hotel: hotelId }),
      Booking.countDocuments({
        hotel: hotelId,
        status: { $in: ['confirmed', 'checked-in'] }
      }),
      Booking.countDocuments({
        hotel: hotelId,
        checkInDate: { $gte: startOfDay, $lt: endOfDay },
        status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
      }),
      buildIncomeReportData(hotelId, 'daily', startOfDay.toISOString().slice(0, 10))
    ]);

    const totalRevenue = report?.summary?.totalIncome || 0;
    const occupiedRooms = activeBookings;
    const occupancyRate = rooms > 0 ? Math.round((occupiedRooms / rooms) * 100) : 0;

    return res.status(200).json({
      status: 'success',
      data: {
        totalRooms: rooms,
        occupiedRooms,
        activeBookings,
        checkInsToday,
        occupancyRate,
        totalRevenue
      }
    });
  } catch (err) {
    console.error('❌ Error fetching hotel stats:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hotel stats',
      data: null
    });
  }
});

// Get hotel by ID or owner (userId)
router.get('/:id', async (req, res) => {
  try {
    const searchId = req.params.id;
    console.log('🏨 Fetching hotel with ID/userId:', searchId);

    let hotel;

    // First try to find by Hotel _id
    try {
      hotel = await Hotel.findById(searchId).populate('owner', 'name email phone');
      if (hotel) {
        console.log('✅ Hotel found by ID:', hotel._id);
        return res.status(200).json({ status: 'success', data: hotel });
      }
    } catch (err) {
      // If findById fails, it means it's not a valid MongoDB ID
    }

    // If not found by ID, try to find by owner (userId)
    console.log('🔍 Hotel not found by ID, searching by owner (userId)...');
    hotel = await Hotel.findOne({ owner: searchId }).populate('owner', 'name email phone');

    if (!hotel) {
      console.log('⚠️ Hotel not found for ID or owner:', searchId);
      return res.status(404).json({
        status: 'failed',
        message: 'Hotel not found',
        searchedId: searchId
      });
    }

    console.log('✅ Hotel found by owner:', hotel._id, hotel.name);
    res.status(200).json({ status: 'success', data: hotel });
  } catch (err) {
    console.error('❌ Error fetching hotel:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
      error: err.message
    });
  }
});

// Create hotel
router.post('/', async (req, res) => {
  try {
    const { name, owner, ...rest } = req.body;

    if (!name || !owner) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }

    const hotel = new Hotel({
      name,
      owner,
      ...rest
    });

    await hotel.save();
    await hotel.populate('owner', 'name email');

    res.status(201).json({
      status: 'success',
      message: 'Hotel created successfully',
      data: hotel
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// Update hotel
router.put('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('owner', 'name email');

    if (!hotel) return res.status(404).json({ status: 'failed', message: 'Hotel not found' });

    res.status(200).json({
      status: 'success',
      message: 'Hotel updated successfully',
      data: hotel
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// Delete hotel
router.delete('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);

    if (!hotel) return res.status(404).json({ status: 'failed', message: 'Hotel not found' });

    res.status(200).json({
      status: 'success',
      message: 'Hotel deleted successfully',
      data: hotel
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// ==================== TUYA DEVICE ROUTES ====================

// Get device status for a specific hotel
// GET /hotels/:hotelId/devices/:deviceId/status
router.get('/:hotelId/devices/:deviceId/status', getDeviceStatus);

// Get device logs for a specific hotel
// GET /hotels/:hotelId/devices/:deviceId/logs?start_time=xxx&end_time=xxx&codes=xxx
router.get('/:hotelId/devices/:deviceId/logs', getDeviceLogs);

// Stream doorbell events for a specific hotel lock
// GET /hotels/:hotelId/devices/:deviceId/bell-stream
router.get('/:hotelId/devices/:deviceId/bell-stream', getDeviceBellStream);

// Get remote unlock request status for a specific hotel lock
// GET /hotels/:hotelId/devices/:deviceId/remote-unlock/request-status
router.get('/:hotelId/devices/:deviceId/remote-unlock/request-status', getDeviceRemoteUnlockRequestStatus);

// Approve a pending remote unlock request
// POST /hotels/:hotelId/devices/:deviceId/remote-unlock/approve
router.post('/:hotelId/devices/:deviceId/remote-unlock/approve', approveDeviceRemoteUnlock);

// Explicit remote unlock action
// POST /hotels/:hotelId/devices/:deviceId/remote-unlock
router.post('/:hotelId/devices/:deviceId/remote-unlock', remoteUnlockDevice);

// Reject a pending remote unlock request
// POST /hotels/:hotelId/devices/:deviceId/remote-unlock/reject
router.post('/:hotelId/devices/:deviceId/remote-unlock/reject', rejectDeviceRemoteUnlock);

// Get device shadow properties for a specific hotel
// GET /hotels/:hotelId/devices/:deviceId/shadow
router.get('/:hotelId/devices/:deviceId/shadow', getDeviceShadowProperties);

// ==================== HOTEL BOOKINGS ====================

// Get all bookings for a hotel
// GET /hotels/:hotelId/bookings?page=1&limit=10&status=confirmed
router.get('/:hotelId/bookings', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    console.log('📋 Fetching bookings for hotel:', hotelId);

    // Validate hotelId is a valid MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid hotel ID',
        data: null
      });
    }

    // Build filter
    let filter = {};

    // Get all rooms for this hotel
    const rooms = await Room.find({ hotel: hotelId }).select('_id');
    const roomIds = rooms.map(r => r._id);

    if (roomIds.length === 0) {
      // No rooms for this hotel, return empty bookings
      return res.status(200).json({
        status: 'success',
        data: [],
        pagination: {
          total: 0,
          pages: 0,
          currentPage: parseInt(page)
        }
      });
    }

    // Filter bookings by rooms in this hotel
    filter.room = { $in: roomIds };

    await syncExpiredBookings({ room: { $in: roomIds } });

    // Filter by status if provided
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await Booking.countDocuments(filter);

    // Fetch bookings with populated references
    const rawBookings = await Booking.find(filter)
      .populate({
        path: 'room',
        select: 'roomType roomNumber bedType price',
        strictPopulate: false
      })
      .populate({
        path: 'guest',
        select: 'name email phone',
        strictPopulate: false
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    console.log('✅ Found', rawBookings.length, 'bookings for hotel:', hotelId);

    // Log first booking for debugging
    if (rawBookings.length > 0) {
      console.log('📍 First booking details:', {
        _id: rawBookings[0]._id,
        guest: rawBookings[0].guest,
        room: rawBookings[0].room,
        status: rawBookings[0].status,
        checkInDate: rawBookings[0].checkInDate,
        checkOutDate: rawBookings[0].checkOutDate
      });
    }

    // Ensure data is properly formatted with fallbacks
    const formattedBookings = rawBookings.map((b, idx) => {
      const bookingObj = b.toObject ? b.toObject() : b;
      console.log(`  Booking ${idx}:`, {
        hasGuest: !!b.guest,
        guestType: typeof b.guest,
        guestValue: b.guest,
        hasRoom: !!b.room,
        roomType: typeof b.room,
        roomValue: b.room
      });

      return {
        ...bookingObj,
        guest: b.guest ? (typeof b.guest === 'object' ? b.guest : { _id: b.guest }) : null,
        room: b.room ? (typeof b.room === 'object' ? b.room : { _id: b.room }) : null,
        guestName: b.guest && typeof b.guest === 'object' ? b.guest.name : 'Unknown',
        roomNumber: b.room && typeof b.room === 'object' ? b.room.roomNumber : 'TBA',
        roomType: b.room && typeof b.room === 'object' ? b.room.roomType : 'Unknown'
      };
    });

    res.status(200).json({
      status: 'success',
      data: formattedBookings,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (err) {
    console.error('❌ Error fetching bookings:', err.message, err.stack);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch bookings',
      error: err.message,
      data: null
    });
  }
});

export default router;
