import PreArrivalCheckIn from '../models/PreArrivalCheckIn.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import mongoose from 'mongoose';

// Get all pre-checkins for a hotel
const getAllPreCheckins = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const checkins = await PreArrivalCheckIn.find(filter)
      .populate('guest', 'name email phone')
      .populate('booking', 'bookingNumber checkInDate checkOutDate')
      .limit(limit * 1)
      .skip(skip)
      .sort({ checkInDate: 1 });

    const total = await PreArrivalCheckIn.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      data: checkins,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Get check-in statistics
const getCheckInStats = async (req, res) => {
  try {
    const { hotelId } = req.params;

    const checkins = await PreArrivalCheckIn.find({ hotel: hotelId });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      totalCheckIns: checkins.length,
      pendingCheckIns: checkins.filter(c => c.status === 'pending').length,
      verifiedCheckIns: checkins.filter(c => c.status === 'verified').length,
      completedCheckIns: checkins.filter(c => c.status === 'completed').length,
      earlyArrivals: checkins.filter(c => {
        const checkInDate = new Date(c.checkInDate);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === today.getTime() && c.status !== 'cancelled';
      }).length
    };

    return res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Create pre-arrival check-in
const createPreCheckin = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      booking,
      bookingId,
      guest,
      guestName,
      email,
      phone,
      idType,
      idNumber,
      checkInDate,
      checkOutDate,
      roomType,
      numberOfGuests,
      specialRequests
    } = req.body;

    if (!bookingId || !guestName || !email || !phone || !idType || !idNumber || !checkInDate) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }

    const checkin = new PreArrivalCheckIn({
      hotel: hotelId,
      booking,
      bookingId,
      guest,
      guestName,
      email,
      phone,
      idType,
      idNumber,
      checkInDate,
      checkOutDate,
      roomType,
      numberOfGuests,
      specialRequests,
      status: 'pending'
    });

    await checkin.save();
    await checkin.populate('guest', 'name email phone');
    await checkin.populate('booking', 'bookingNumber checkInDate checkOutDate');

    return res.status(201).json({
      status: 'success',
      data: checkin,
      message: 'Pre-arrival check-in created successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Verify guest identity
const verifyIdentity = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { verifiedBy } = req.body;

    const checkin = await PreArrivalCheckIn.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy
      },
      { new: true }
    ).populate('guest', 'name email phone').populate('booking', 'bookingNumber checkInDate checkOutDate');

    if (!checkin) {
      return res.status(404).json({ status: 'failed', message: 'Check-in record not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: checkin,
      message: 'Guest identity verified successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Complete check-in
const completeCheckIn = async (req, res) => {
  try {
    const { hotelId, id } = req.params;

    const checkin = await PreArrivalCheckIn.findOne({ _id: id, hotel: hotelId });

    if (!checkin) {
      return res.status(404).json({ status: 'failed', message: 'Check-in record not found' });
    }

    let booking = null;

    if (checkin.booking) {
      booking = await Booking.findOne({ _id: checkin.booking, hotel: hotelId });
    }

    if (!booking && checkin.bookingId) {
      const bookingLookup = [{ bookingNumber: checkin.bookingId }];
      if (mongoose.Types.ObjectId.isValid(checkin.bookingId)) {
        bookingLookup.push({ _id: checkin.bookingId });
      }

      booking = await Booking.findOne({
        hotel: hotelId,
        $or: bookingLookup
      });
    }

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Linked booking not found for this pre-check-in record'
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'checked-out') {
      return res.status(400).json({
        status: 'failed',
        message: `Cannot complete check-in for a ${booking.status} booking`
      });
    }

    booking.status = 'checked-in';
    await booking.save();

    if (booking.room) {
      await Room.findOneAndUpdate(
        { _id: booking.room, hotel: hotelId },
        {
          status: 'occupied',
          currentGuest: booking.guest,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate
        }
      );
    }

    checkin.status = 'completed';
    checkin.completedAt = new Date();
    checkin.booking = booking._id;
    checkin.bookingId = booking._id.toString();
    await checkin.save();

    await checkin.populate('guest', 'name email phone');
    await checkin.populate({
      path: 'booking',
      select: 'bookingNumber checkInDate checkOutDate status room',
      populate: {
        path: 'room',
        select: 'roomNumber roomType status'
      }
    });

    return res.status(200).json({
      status: 'success',
      data: checkin,
      message: 'Check-in completed successfully and booking/room status synced'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Get pre-checkin by ID
const getPreCheckinById = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const checkin = await PreArrivalCheckIn.findOne({ _id: id, hotel: hotelId })
      .populate('guest', 'name email phone')
      .populate('booking');

    if (!checkin) {
      return res.status(404).json({ status: 'failed', message: 'Check-in record not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: checkin
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Delete pre-checkin
const deletePreCheckin = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const checkin = await PreArrivalCheckIn.findOneAndDelete({ _id: id, hotel: hotelId });

    if (!checkin) {
      return res.status(404).json({ status: 'failed', message: 'Check-in record not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Check-in record deleted successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export {
  getAllPreCheckins,
  getCheckInStats,
  createPreCheckin,
  verifyIdentity,
  completeCheckIn,
  getPreCheckinById,
  deletePreCheckin
};
