import Transaction from '../models/Transaction.js';
import Booking from '../models/Booking.js';
import FoodOrder from '../models/FoodOrder.js';
import RoomServiceMenuItem from '../models/RoomServiceMenuItem.js';
import Hotel from '../models/Hotel.js';
import { sendIncomeReportEmail } from '../services/emailService.js';

const buildReportRange = (period, dateInput, endDateInput) => {
  const now = new Date();
  let start;

  if (period === 'custom') {
    const customStart = dateInput ? new Date(`${dateInput}T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const customEndBase = endDateInput ? new Date(`${endDateInput}T00:00:00.000Z`) : new Date(customStart);
    const end = new Date(customEndBase);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: customStart, end };
  }

  if (period === 'monthly') {
    if (dateInput) {
      const [year, month] = dateInput.split('-').map(Number);
      start = new Date(Date.UTC(year, (month || 1) - 1, 1, 0, 0, 0, 0));
    } else {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    }
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { start, end };
  }

  if (dateInput) {
    start = new Date(`${dateInput}T00:00:00.000Z`);
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const roundCurrency = (value) => Math.round((value || 0) * 100) / 100;

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');

const getRoomServiceBreakdown = (bookings) => {
  let revenue = 0;
  let count = 0;
  let pendingAmount = 0;

  bookings.forEach((booking) => {
    (booking.roomServiceOrders || []).forEach((order) => {
      if (order.status === 'cancelled') {
        return;
      }

      const amount = order.totalPrice || 0;
      revenue += amount;
      count += 1;

      if (order.status !== 'delivered') {
        pendingAmount += amount;
      }
    });
  });

  return { revenue, count, pendingAmount };
};

const getHotelServiceBreakdown = (bookings) => {
  let revenue = 0;
  let count = 0;
  let pendingAmount = 0;

  bookings.forEach((booking) => {
    (booking.hotelServiceOrders || []).forEach((order) => {
      if (order.status === 'cancelled') {
        return;
      }

      const amount = order.totalPrice || order.price || 0;
      revenue += amount;
      count += 1;

      if (order.status !== 'completed') {
        pendingAmount += amount;
      }
    });
  });

  return { revenue, count, pendingAmount };
};

// Get all transactions for a hotel
const getAllTransactions = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { type, status, guestName, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (guestName) filter.guestName = { $regex: guestName, $options: 'i' };

    const skip = (page - 1) * limit;
    const transactions = await Transaction.find(filter)
      .populate('guest', 'name email')
      .populate('booking', 'bookingNumber')
      .limit(limit * 1)
      .skip(skip)
      .sort({ timestamp: -1 });

    const total = await Transaction.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      data: transactions,
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

// Get revenue statistics - AUTO-CALCULATED FROM REAL DATA SOURCES
const getRevenueStats = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // First, sync transactions from real sources
    await syncTransactionsFromSources(hotelId);

    // Calculate room revenue from confirmed/checked-in bookings
    const roomBookings = await Booking.find({
      hotel: hotelId,
      status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
    });

    const roomRevenue = roomBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    const roomTransactionCount = roomBookings.length;
    const roomPendingAmount = roomBookings.reduce((sum, booking) => {
      return booking.status === 'checked-out' ? sum : sum + (booking.totalPrice || 0);
    }, 0);

    // Calculate food and drink revenue from food orders
    const foodOrders = await FoodOrder.find({
      hotel: hotelId,
      status: { $ne: 'cancelled' }
    });

    let foodRevenue = 0;
    let drinkRevenue = 0;
    let foodTransactionCount = 0;
    let foodPendingAmount = 0;
    let drinkPendingAmount = 0;

    foodOrders.forEach(order => {
      const amount = order.totalPrice || 0;

      if (order.category === 'drink') {
        drinkRevenue += amount;
        if (order.status !== 'delivered') {
          drinkPendingAmount += amount;
        }
      } else if (order.category === 'food' || order.category === 'mixed') {
        foodRevenue += amount;
        if (order.status !== 'delivered') {
          foodPendingAmount += amount;
        }
      }
      foodTransactionCount += 1;
    });

    // Include embedded booking orders the same way the report does
    const bookingsWithServices = await Booking.find({
      hotel: hotelId,
      $or: [
        { 'roomServiceOrders.0': { $exists: true } },
        { 'hotelServiceOrders.0': { $exists: true } }
      ]
    });

    const roomServiceBreakdown = getRoomServiceBreakdown(bookingsWithServices);
    const hotelServiceBreakdown = getHotelServiceBreakdown(bookingsWithServices);

    foodRevenue += roomServiceBreakdown.revenue;
    foodTransactionCount += roomServiceBreakdown.count;
    foodPendingAmount += roomServiceBreakdown.pendingAmount;

    let serviceRevenue = hotelServiceBreakdown.revenue;
    let serviceTransactionCount = hotelServiceBreakdown.count;
    let servicePendingAmount = hotelServiceBreakdown.pendingAmount;

    let pendingAmount = roomPendingAmount + foodPendingAmount + drinkPendingAmount + servicePendingAmount;

    // Include standalone service bookings if that model exists in this deployment
    try {
      const ServiceBooking = require('../models/ServiceBooking.js').default;
      const serviceBookings = await ServiceBooking.find({
        hotel: hotelId,
        status: { $in: ['completed', 'paid', 'pending', 'confirmed', 'in-progress'] }
      });

      serviceBookings.forEach((booking) => {
        const amount = booking.totalPrice || booking.price || 0;
        serviceRevenue += amount;
        serviceTransactionCount += 1;

        if (!['completed', 'paid'].includes(booking.status)) {
          servicePendingAmount += amount;
          pendingAmount += amount;
        }
      });
    } catch (e) {
      console.log('ℹ️  Service booking model not available');
    }

    const totalTransactions = roomTransactionCount + foodTransactionCount + serviceTransactionCount;

    const stats = {
      totalRevenue: roundCurrency(roomRevenue + foodRevenue + drinkRevenue + serviceRevenue),
      roomRevenue: roundCurrency(roomRevenue),
      foodRevenue: roundCurrency(foodRevenue),
      drinkRevenue: roundCurrency(drinkRevenue),
      serviceRevenue: roundCurrency(serviceRevenue),
      totalTransactions: totalTransactions,
      pendingAmount: roundCurrency(pendingAmount),
      completedCount: totalTransactions
    };

    console.log('💰 Revenue Stats Calculated:', stats);

    return res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    console.error('❌ Error calculating revenue stats:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const buildIncomeReportData = async (hotelId, period, date, endDate) => {
  const { start, end } = buildReportRange(period, date, endDate);

  const bookings = await Booking.find({
    hotel: hotelId,
    status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
    createdAt: { $gte: start, $lt: end }
  })
    .populate('guest', 'name email')
    .populate('room', 'roomNumber roomType');

  const serviceBookings = await Booking.find({
    hotel: hotelId,
    $or: [
      { 'roomServiceOrders.0': { $exists: true } },
      { 'hotelServiceOrders.0': { $exists: true } }
    ]
  })
    .populate('guest', 'name email')
    .populate('room', 'roomNumber roomType');

  const foodOrders = await FoodOrder.find({
    hotel: hotelId,
    status: { $ne: 'cancelled' },
    createdAt: { $gte: start, $lt: end }
  }).populate('guest', 'name email');

  const roomEntries = bookings.map((booking) => ({
    type: 'room-booking',
    category: 'Room Bookings',
    label: booking.bookingNumber || `Booking ${booking._id.toString().slice(-6)}`,
    guestName: booking.guest?.name || 'Unknown Guest',
    roomNumber: booking.room?.roomNumber || '',
    amount: roundCurrency(booking.totalPrice || 0),
    status: booking.status,
    occurredAt: booking.createdAt
  }));

  const roomServiceEntries = [];
  const inhouseServiceEntries = [];

  serviceBookings.forEach((booking) => {
    const guestName = booking.guest?.name || 'Unknown Guest';
    const roomNumber = booking.room?.roomNumber || '';

    (booking.roomServiceOrders || []).forEach((order) => {
      const occurredAt = order.orderedAt || booking.updatedAt || booking.createdAt;
      if (order.status === 'cancelled' || occurredAt < start || occurredAt >= end) {
        return;
      }

      roomServiceEntries.push({
        type: 'room-service',
        category: 'Food & Drink Orders',
        label: order.items?.map((item) => item.name).filter(Boolean).join(', ') || 'Room service order',
        guestName,
        roomNumber,
        amount: roundCurrency(order.totalPrice || 0),
        status: order.status,
        occurredAt
      });
    });

    (booking.hotelServiceOrders || []).forEach((order) => {
      const occurredAt = order.requestedAt || booking.updatedAt || booking.createdAt;
      if (order.status === 'cancelled' || occurredAt < start || occurredAt >= end) {
        return;
      }

      inhouseServiceEntries.push({
        type: 'inhouse-service',
        category: 'Inhouse Services',
        label: order.name || 'Inhouse service',
        guestName,
        roomNumber,
        amount: roundCurrency(order.totalPrice || order.price || 0),
        status: order.status,
        occurredAt
      });
    });
  });

  const foodOrderEntries = foodOrders.map((order) => ({
    type: order.category === 'drink' ? 'drink-order' : 'food-order',
    category: 'Food & Drink Orders',
    label: order.items?.join(', ') || `${order.category || 'Food'} order`,
    guestName: order.guestName || order.guest?.name || 'Unknown Guest',
    roomNumber: order.roomNumber || '',
    amount: roundCurrency(order.totalPrice || 0),
    status: order.status,
    occurredAt: order.createdAt
  }));

  const entries = [
    ...roomEntries,
    ...foodOrderEntries,
    ...roomServiceEntries,
    ...inhouseServiceEntries
  ].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

  const summary = {
    roomBookings: roundCurrency(roomEntries.reduce((sum, entry) => sum + entry.amount, 0)),
    foodAndDrinks: roundCurrency([...foodOrderEntries, ...roomServiceEntries].reduce((sum, entry) => sum + entry.amount, 0)),
    inhouseServices: roundCurrency(inhouseServiceEntries.reduce((sum, entry) => sum + entry.amount, 0))
  };

  return {
    period,
    startDate: start,
    endDate: new Date(end.getTime() - 1),
    generatedAt: new Date(),
    summary: {
      ...summary,
      totalIncome: roundCurrency(summary.roomBookings + summary.foodAndDrinks + summary.inhouseServices)
    },
    entries
  };
};

const getIncomeReport = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const period = req.query.period === 'monthly' ? 'monthly' : req.query.period === 'custom' ? 'custom' : 'daily';
    const { date, endDate } = req.query;

    const report = await buildIncomeReportData(hotelId, period, date, endDate);

    return res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (err) {
    console.error('❌ Error generating income report:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to generate income report' });
  }
};

const sendIncomeReport = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const period = req.body.period === 'monthly' ? 'monthly' : req.body.period === 'custom' ? 'custom' : 'daily';
    const date = req.body.date;
    const endDate = req.body.endDate;
    const recipientEmail = (req.body.recipientEmail || '').trim().toLowerCase();

    if (!isValidEmail(recipientEmail)) {
      return res.status(400).json({ status: 'error', message: 'A valid recipient email is required' });
    }

    const hotel = await Hotel.findById(hotelId).select('name');
    if (!hotel) {
      return res.status(404).json({ status: 'error', message: 'Hotel not found' });
    }

    const report = await buildIncomeReportData(hotelId, period, date, endDate);

    await sendIncomeReportEmail(recipientEmail, {
      hotelName: hotel.name || 'Hotel',
      report
    });

    return res.status(200).json({
      status: 'success',
      message: `Income report sent to ${recipientEmail}`
    });
  } catch (err) {
    console.error('❌ Error sending income report email:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to send income report email' });
  }
};

// Sync transactions from real data sources (helper function)
const syncTransactionsFromSources = async (hotelId) => {
  try {
    console.log('🔄 Syncing transactions from real sources...');

    // Get confirmed/checked-in bookings and create room transactions
    const roomBookings = await Booking.find({
      hotel: hotelId,
      status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
    }).populate('guest', 'name email');

    for (const booking of roomBookings) {
      // Check if transaction already exists for this booking
      const existingTx = await Transaction.findOne({
        hotel: hotelId,
        booking: booking._id,
        type: 'room'
      });

      if (!existingTx && booking.totalPrice > 0) {
        await Transaction.create({
          hotel: hotelId,
          type: 'room',
          description: `Room booking - ${booking.numberOfNights || 1} nights`,
          amount: booking.totalPrice,
          guestName: booking.guest?.name || 'Unknown Guest',
          guest: booking.guest?._id,
          booking: booking._id,
          status: booking.status === 'checked-out' ? 'completed' : 'pending',
          paymentMethod: booking.paymentMethod || 'card',
          timestamp: booking.createdAt || new Date()
        });
      }
    }

    // Get non-cancelled food orders and create food/drink transactions
    const foodOrders = await FoodOrder.find({
      hotel: hotelId,
      status: { $ne: 'cancelled' }
    }).populate('guest', 'name email');

    for (const order of foodOrders) {
      // Check if transaction already exists
      const existingTx = await Transaction.findOne({
        hotel: hotelId,
        description: { $regex: order.orderId || '' }
      });

      if (!existingTx && order.totalPrice > 0) {
        const type = order.category === 'drink' ? 'drink' : 'food';
        await Transaction.create({
          hotel: hotelId,
          type: type,
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} order - Room ${order.roomNumber}`,
          amount: order.totalPrice,
          guestName: order.guestName || order.guest?.name || 'Unknown Guest',
          guest: order.guest?._id,
          status: order.status === 'delivered' ? 'completed' : 'pending',
          paymentMethod: 'card',
          timestamp: order.createdAt || new Date()
        });
      }
    }

    // Sync embedded room service and hotel service orders from bookings
    const bookingsWithServices = await Booking.find({
      hotel: hotelId,
      $or: [
        { 'roomServiceOrders.0': { $exists: true } },
        { 'hotelServiceOrders.0': { $exists: true } }
      ]
    }).populate('guest', 'name email').populate('room', 'roomNumber');

    for (const booking of bookingsWithServices) {
      const guestName = booking.guest?.name || 'Unknown Guest';
      const roomNumber = booking.room?.roomNumber || '';

      for (const order of booking.roomServiceOrders || []) {
        if (order.status === 'cancelled' || !order.totalPrice) {
          continue;
        }

        const orderId = order._id?.toString();
        const description = `Room service order${orderId ? ` #${orderId.slice(-6)}` : ''} - Room ${roomNumber || 'N/A'}`;
        const existingTx = await Transaction.findOne({
          hotel: hotelId,
          booking: booking._id,
          type: 'food',
          description
        });

        if (!existingTx) {
          await Transaction.create({
            hotel: hotelId,
            type: 'food',
            description,
            amount: order.totalPrice,
            guestName,
            guest: booking.guest?._id,
            booking: booking._id,
            status: order.status === 'delivered' ? 'completed' : 'pending',
            paymentMethod: 'card',
            timestamp: order.orderedAt || booking.updatedAt || booking.createdAt || new Date()
          });
        }
      }

      for (const order of booking.hotelServiceOrders || []) {
        if (order.status === 'cancelled' || !(order.totalPrice || order.price)) {
          continue;
        }

        const amount = order.totalPrice || order.price || 0;
        const orderId = order._id?.toString();
        const description = `${order.name || 'Inhouse service'}${orderId ? ` #${orderId.slice(-6)}` : ''} - Room ${roomNumber || 'N/A'}`;
        const existingTx = await Transaction.findOne({
          hotel: hotelId,
          booking: booking._id,
          type: 'service',
          description
        });

        if (!existingTx) {
          await Transaction.create({
            hotel: hotelId,
            type: 'service',
            description,
            amount,
            guestName,
            guest: booking.guest?._id,
            booking: booking._id,
            status: order.status === 'completed' ? 'completed' : 'pending',
            paymentMethod: 'card',
            timestamp: order.requestedAt || booking.updatedAt || booking.createdAt || new Date()
          });
        }
      }
    }

    console.log('✅ Transactions synced from real sources');
  } catch (err) {
    console.error('❌ Error syncing transactions:', err.message);
  }
};

// Create a new transaction
const createTransaction = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { type, description, amount, guestName, guest, booking, status, paymentMethod } = req.body;

    if (!type || !description || !amount || !guestName) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }

    const transaction = new Transaction({
      hotel: hotelId,
      type,
      description,
      amount,
      guestName,
      guest,
      booking,
      status: status || 'pending',
      paymentMethod: paymentMethod || 'card'
    });

    await transaction.save();
    await transaction.populate('guest', 'name email');
    await transaction.populate('booking', 'bookingNumber');

    return res.status(201).json({
      status: 'success',
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Update transaction status
const updateTransactionStatus = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ status: 'failed', message: 'Status is required' });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { status },
      { new: true }
    ).populate('guest', 'name email').populate('booking', 'bookingNumber');

    if (!transaction) {
      return res.status(404).json({ status: 'failed', message: 'Transaction not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: transaction,
      message: 'Transaction updated successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Get transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const transaction = await Transaction.findOne({ _id: id, hotel: hotelId })
      .populate('guest', 'name email phone')
      .populate('booking');

    if (!transaction) {
      return res.status(404).json({ status: 'failed', message: 'Transaction not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: transaction
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const transaction = await Transaction.findOneAndDelete({ _id: id, hotel: hotelId });

    if (!transaction) {
      return res.status(404).json({ status: 'failed', message: 'Transaction not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export {
  getAllTransactions,
  getRevenueStats,
  getIncomeReport,
  sendIncomeReport,
  createTransaction,
  updateTransactionStatus,
  getTransactionById,
  deleteTransaction,
  buildIncomeReportData
};
