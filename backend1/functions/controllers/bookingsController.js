import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import VendorChat from "../models/VendorChat.js";
import Hotel from "../models/Hotel.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { ensureCheckoutCleaningTask } from "../services/roomTaskService.js";
import { sendStayReviewReminderEmail, sendGuestWelcomeEmail } from "../services/emailService.js";
import { revokeSmartLockAccessForBooking } from "./smartLockController.js";

const sendCheckoutReviewReminder = async (booking) => {
  try {
    if (!booking || booking.reviewReminderSentAt) {
      return;
    }

    const hotelDoc = booking.hotel?.name
      ? booking.hotel
      : await Hotel.findById(booking.hotel).select('name');
    const guestDoc = booking.guest?.email
      ? booking.guest
      : await User.findById(booking.guest).select('name email');

    if (!guestDoc?.email) {
      return;
    }

    const roomLabel = booking.room?.roomNumber
      ? `Room ${booking.room.roomNumber}`
      : (booking.room?.roomType ? `${booking.room.roomType} Room` : 'your room');

    await sendStayReviewReminderEmail(guestDoc.email, {
      guestName: guestDoc.name || 'Guest',
      hotelName: hotelDoc?.name || 'Hotel',
      roomLabel,
      checkOutDate: booking.checkOutDate,
      reviewUrl: 'https://www.smarttrackbookings.live/customer-dashboard'
    });

    await Booking.findByIdAndUpdate(booking._id, {
      reviewReminderSentAt: new Date()
    });
  } catch (error) {
    console.error('Failed to send checkout review reminder:', error);
  }
};

const revokeGuestSmartAccessIfNeeded = async (bookingId) => {
  try {
    await revokeSmartLockAccessForBooking(bookingId);
  } catch (error) {
    console.warn('Failed to revoke smart lock access during checkout:', error.message);
  }
};

const syncExpiredBookings = async (baseFilter = {}) => {
  const now = new Date();
  const expiredFilter = {
    ...baseFilter,
    status: { $in: ['confirmed', 'checked-in'] },
    checkOutDate: { $lt: now }
  };

  const expiredBookings = await Booking.find(expiredFilter)
    .select('_id hotel room guest status checkOutDate reviewReminderSentAt')
    .populate('room', 'roomNumber roomType')
    .populate('hotel', 'name')
    .populate('guest', 'name email');
  if (!expiredBookings.length) {
    return 0;
  }

  const bookingIds = expiredBookings.map((booking) => booking._id);
  const roomIds = expiredBookings
    .map((booking) => booking.room)
    .filter(Boolean);

  await Booking.updateMany(
    { _id: { $in: bookingIds } },
    { $set: { status: 'checked-out' } }
  );

  if (roomIds.length) {
    await Room.updateMany(
      { _id: { $in: roomIds } },
      {
        $set: {
          status: 'available',
          currentGuest: null,
          checkInDate: null,
          checkOutDate: null
        }
      }
    );
  }

  await Promise.all(
    expiredBookings.map((booking) =>
      ensureCheckoutCleaningTask({
        _id: booking._id,
        hotel: booking.hotel,
        room: booking.room?._id || booking.room,
        roomNumber: booking.room?.roomNumber,
        status: 'checked-out'
      })
    )
  );

  await Promise.all(
    expiredBookings.map((booking) => sendCheckoutReviewReminder(booking))
  );

  await Promise.all(
    expiredBookings.map((booking) => revokeGuestSmartAccessIfNeeded(booking._id))
  );

  console.log(`✅ Auto checked-out ${expiredBookings.length} expired booking(s)`);
  return expiredBookings.length;
};

/**
 * Create vendor chat for hotel booking
 */
const createHotelBookingChat = async (booking, hotelData) => {
  try {
    const hotelName = hotelData?.name || 'our hotel';
    const welcomeMessage = `Welcome to ${hotelName}! Thank you for booking with us. Use your mobile phone to access hotel services, order food and drinks, and track your delivery in real time all from the comfort of your room. Enjoy your stay!`;

    const vendorChat = new VendorChat({
      customerId: booking.guest,
      bookingId: booking._id.toString(),
      vendorId: booking.hotel.toString(),
      vendorName: hotelData?.name || 'Hotel',
      vendorType: 'hotel',
      vendorIcon: '🏨',
      subject: `Hotel Booking Confirmation`,
      status: 'open',
      messages: [
        {
          _id: new mongoose.Types.ObjectId(),
          sender: 'vendor',
          senderName: hotelData?.name || 'Hotel',
          message: welcomeMessage,
          timestamp: new Date(),
          read: false
        }
      ]
    });
    await vendorChat.save();
    console.log('✅ Vendor chat created for hotel booking:', vendorChat._id);
    return vendorChat;
  } catch (error) {
    console.error('⚠️ Error creating vendor chat:', error.message);
    return null;
  }
};

// Get all bookings for a hotel
const getAllBookings = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, paymentStatus, page = 1, limit = 10 } = req.query;

    console.log('📋 ========== GET HOTEL BOOKINGS ==========');
    console.log('🏨 Hotel ID:', hotelId);
    console.log('🔍 Query params:', { status, paymentStatus, page, limit });

    let filter = { hotel: hotelId };
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    await syncExpiredBookings({ hotel: hotelId });

    console.log('🔎 Filter object:', filter);

    const skip = (page - 1) * limit;
    const bookings = await Booking.find(filter)
      .populate("hotel", "name")
      .populate("guest", "name email phone")
      .populate("room", "roomNumber roomType")
      .limit(limit * 1)
      .skip(skip)
      .sort({ checkInDate: -1 });

    console.log('✅ Found', bookings.length, 'bookings matching filter');

    const total = await Booking.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: bookings,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    await syncExpiredBookings({ _id: id });

    const booking = await Booking.findById(id)
      .populate("hotel", "name")
      .populate("guest", "name email phone")
      .populate("room", "roomNumber roomType pricePerNight");

    if (!booking) return res.status(404).json({ status: "failed", message: "Booking not found" });

    return res.status(200).json({ status: "success", data: booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Create new booking
const createBooking = async (req, res) => {
  try {
    const { hotelId } = req.params;
    // Accept both 'guest' (vendor input) and 'customerId' (customer input) for backward compatibility
    const { guest, customerId, room, roomId, checkInDate, checkOutDate, numberOfGuests, roomRate, hotelId: bodyHotelId, ...rest } = req.body;

    const guestId = guest || customerId;
    const roomId_ = room || roomId;
    const routeHotelId = hotelId ? hotelId.toString() : '';
    const requestedHotelId = bodyHotelId ? bodyHotelId.toString() : '';

    if (routeHotelId && requestedHotelId && routeHotelId !== requestedHotelId) {
      return res.status(400).json({
        status: "failed",
        message: "Hotel ID mismatch between booking URL and request body"
      });
    }

    const hId = requestedHotelId || routeHotelId;

    console.log('📝 Creating booking with:', { guestId, roomId: roomId_, hotelId: hId });

    if (!guestId || !roomId_ || !checkInDate || !checkOutDate) {
      return res.status(400).json({ status: "failed", message: "Missing required fields: guest/customerId, room/roomId, checkInDate, checkOutDate" });
    }

    // Generate booking number
    const bookingNumber = "BK-" + Date.now().toString().slice(-10);

    const booking = new Booking({
      hotel: hId,
      bookingNumber,
      guest: guestId,
      room: roomId_,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      roomRate,
      ...rest
    });

    console.log('💾 Saving booking to database...');
    console.log('📝 Full booking object before save:', booking.toObject());
    await booking.save();
    console.log('✅ BOOKING SAVED SUCCESSFULLY!');
    console.log('📌 Booking ID:', booking._id);
    console.log('👤 Guest ID:', booking.guest);
    console.log('🏨 Hotel ID:', booking.hotel);
    console.log('🛏️  Room ID:', booking.room);

    await booking.populate("hotel", "name");
    await booking.populate("guest", "name email phone");
    await booking.populate("room", "roomNumber roomType");

    // Create vendor chat for booking
    const hotelData = booking.hotel;
    await createHotelBookingChat(booking, hotelData);

    // Send welcome email
    if (booking.guest?.email) {
      await sendGuestWelcomeEmail(booking.guest.email, {
        guestName: booking.guest.name || 'Guest',
        hotelName: hotelData?.name || 'Hotel'
      });
    }

    // Update room status
    await Room.findByIdAndUpdate(room, { status: "reserved" });

    return res.status(201).json({
      status: "success",
      message: "Booking created successfully",
      data: booking
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Update booking
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const booking = await Booking.findByIdAndUpdate(id, updates, { new: true })
      .populate("hotel", "name")
      .populate("guest", "name email phone")
      .populate("room", "roomNumber roomType");

    if (!booking) return res.status(404).json({ status: "failed", message: "Booking not found" });

    return res.status(200).json({
      status: "success",
      message: "Booking updated successfully",
      data: booking
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Delete booking
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) return res.status(404).json({ status: "failed", message: "Booking not found" });

    // Update room status back to available
    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room, { status: "available" });
    }

    return res.status(200).json({
      status: "success",
      message: "Booking deleted successfully",
      data: booking
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "checked-in", "checked-out", "cancelled"].includes(status)) {
      return res.status(400).json({ status: "failed", message: "Invalid status" });
    }

    const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true })
      .populate('room', 'roomNumber roomType')
      .populate('hotel', 'name')
      .populate('guest', 'name email');
    if (!booking) return res.status(404).json({ status: "failed", message: "Booking not found" });

    if (status === 'checked-out') {
      await Room.findByIdAndUpdate(booking.room?._id || booking.room, {
        status: 'cleaning',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null
      });
      await ensureCheckoutCleaningTask({
        _id: booking._id,
        hotel: booking.hotel,
        room: booking.room?._id || booking.room,
        roomNumber: booking.room?.roomNumber,
        status
      });
      await sendCheckoutReviewReminder(booking);
      await revokeGuestSmartAccessIfNeeded(booking._id);
    }

    if (status === 'cancelled') {
      await revokeGuestSmartAccessIfNeeded(booking._id);
    }

    return res.status(200).json({
      status: "success",
      message: "Booking status updated",
      data: booking
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!["unpaid", "partial", "paid", "refunded"].includes(paymentStatus)) {
      return res.status(400).json({ status: "failed", message: "Invalid payment status" });
    }

    const booking = await Booking.findByIdAndUpdate(id, { paymentStatus }, { new: true });
    if (!booking) return res.status(404).json({ status: "failed", message: "Booking not found" });

    return res.status(200).json({
      status: "success",
      message: "Payment status updated",
      data: booking
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Add room service order to a booking
const addRoomServiceOrder = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { items, totalPrice, notes, estimatedDurationMinutes = 30 } = req.body;

    console.log('🍽️ ========== ADD ROOM SERVICE ORDER ==========');
    console.log('📌 Booking ID:', bookingId);
    console.log('📦 Order items:', items);
    console.log('💰 Total price:', totalPrice);
    console.log('📝 Notes:', notes);

    if (!bookingId || !items || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: bookingId, items"
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found"
      });
    }

    const roomServiceOrder = {
      _id: new mongoose.Types.ObjectId(),
      items,
      totalPrice,
      notes,
      status: 'pending',
      estimatedDurationMinutes,
      orderedAt: new Date(),
      etaAt: new Date(Date.now() + (Number(estimatedDurationMinutes) * 60 * 1000))
    };

    if (!booking.roomServiceOrders) {
      booking.roomServiceOrders = [];
    }
    booking.roomServiceOrders.push(roomServiceOrder);
    await booking.save();

    console.log('✅ Room service order added successfully!');
    console.log('🔔 Order ID:', roomServiceOrder._id);

    return res.status(201).json({
      status: "success",
      message: "Room service order placed successfully",
      data: {
        orderId: roomServiceOrder._id,
        booking
      }
    });
  } catch (err) {
    console.error('❌ Error adding room service order:', err);
    return res.status(500).json({
      status: "error",
      message: "Failed to place room service order",
      error: err.message
    });
  }
};

/**
 * Update a room service order
 * Only allowed if status is 'pending' or 'confirmed'
 */
const updateRoomServiceOrder = async (req, res) => {
  try {
    const { bookingId, orderId } = req.params;
    const { items, totalPrice, notes } = req.body;

    console.log('🔄 ========== UPDATE ROOM SERVICE ORDER ==========');
    console.log('📌 Booking ID:', bookingId);
    console.log('🔔 Order ID:', orderId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ status: "error", message: "Booking not found" });
    }

    const orderIndex = booking.roomServiceOrders.findIndex(o => o._id.toString() === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    const order = booking.roomServiceOrders[orderIndex];

    // Only allow editing if pending or confirmed
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        status: "error", 
        message: `Order cannot be edited in its current status: ${order.status}` 
      });
    }

    // Update fields if provided
    if (items) order.items = items;
    if (totalPrice !== undefined) order.totalPrice = totalPrice;
    if (notes !== undefined) order.notes = notes;
    if (order.status === 'confirmed') order.status = 'preparing';
    if (order.status === 'en-route') order.status = 'delivering';

    booking.roomServiceOrders[orderIndex] = order;
    await booking.save();

    console.log('✅ Room service order updated successfully!');

    return res.status(200).json({
      status: "success",
      message: "Order updated successfully",
      data: { booking }
    });
  } catch (err) {
    console.error('❌ Error updating room service order:', err);
    return res.status(500).json({
      status: "error",
      message: "Failed to update room service order",
      error: err.message
    });
  }
};

export {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  updatePaymentStatus,
  addRoomServiceOrder,
  updateRoomServiceOrder,
  syncExpiredBookings
};
