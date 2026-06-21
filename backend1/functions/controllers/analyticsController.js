import OccupancyAnalytics from '../models/OccupancyAnalytics.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import { buildIncomeReportData } from './revenueController.js';

const buildRecentDateRange = (days) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));

  return { startDate, endDate: today };
};

const formatDateKey = (date) => {
  return new Date(date).toISOString().slice(0, 10);
};

const buildDailyRevenueSeries = async (hotelId, days) => {
  const { startDate } = buildRecentDateRange(days);
  const requests = [];

  for (let offset = 0; offset < days; offset += 1) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + offset);
    const dateKey = formatDateKey(currentDate);

    requests.push(
      buildIncomeReportData(hotelId, 'daily', dateKey).then((report) => ({
        date: dateKey,
        revenue: report?.summary?.totalIncome || 0
      }))
    );
  }

  return Promise.all(requests);
};

const buildRevenueMap = (series) => {
  return series.reduce((acc, item) => {
    acc[item.date] = item.revenue || 0;
    return acc;
  }, {});
};

// Get analytics statistics
const getAnalyticsStats = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // Get analytics data for last 30 days
    const { startDate } = buildRecentDateRange(30);

    const analyticsData = await OccupancyAnalytics.find({
      hotel: hotelId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const revenueSeries = await buildDailyRevenueSeries(hotelId, 30);
    const revenueValues = revenueSeries.map((item) => item.revenue || 0);

    // Calculate statistics
    let stats = {
      averageOccupancy: 0,
      peakOccupancy: 0,
      lowOccupancy: 100,
      averageRevenue: 0,
      totalRevenue: 0,
      totalGuests: 0,
      averageStay: 0
    };

    if (analyticsData.length > 0) {
      const occupancyRates = analyticsData.map(d => d.occupancyRate);
      const stays = analyticsData.map(d => d.averageStay || 0);

      stats.averageOccupancy = Math.round(occupancyRates.reduce((a, b) => a + b, 0) / occupancyRates.length);
      stats.peakOccupancy = Math.max(...occupancyRates);
      stats.lowOccupancy = Math.min(...occupancyRates);
      stats.totalGuests = analyticsData.reduce((sum, d) => sum + (d.totalGuests || 0), 0);
      stats.averageStay = Number((stays.reduce((a, b) => a + b, 0) / stays.length).toFixed(1));
    }

    stats.totalRevenue = revenueValues.reduce((a, b) => a + b, 0);
    stats.averageRevenue = revenueValues.length > 0 ? Math.round(stats.totalRevenue / revenueValues.length) : 0;

    return res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Get occupancy trend for last 7 days
const getOccupancyTrend = async (req, res) => {
  try {
    const { hotelId } = req.params;

    const { startDate } = buildRecentDateRange(7);

    const trendData = await OccupancyAnalytics.find({
      hotel: hotelId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const revenueSeries = await buildDailyRevenueSeries(hotelId, 7);
    const revenueMap = buildRevenueMap(revenueSeries);

    // Format dates
    const formattedData = trendData.map(d => ({
      date: formatDateKey(d.date),
      occupancyRate: d.occupancyRate,
      occupiedRooms: d.occupiedRooms,
      totalRooms: d.totalRooms,
      revenue: revenueMap[formatDateKey(d.date)] || 0
    }));

    return res.status(200).json({
      status: 'success',
      data: formattedData
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Get revenue trend for last 7 days
const getRevenueTrend = async (req, res) => {
  try {
    const { hotelId } = req.params;

    const revenueSeries = await buildDailyRevenueSeries(hotelId, 7);

    const formattedData = revenueSeries.map((item) => ({
      date: item.date,
      revenue: item.revenue
    }));

    return res.status(200).json({
      status: 'success',
      data: formattedData
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Get occupancy data with details
const getOccupancyData = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const data = await OccupancyAnalytics.find({ hotel: hotelId })
      .limit(limit * 1)
      .skip(skip)
      .sort({ date: -1 });

    const total = await OccupancyAnalytics.countDocuments({ hotel: hotelId });

    return res.status(200).json({
      status: 'success',
      data: data,
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

// Create or update occupancy record (typically called daily)
const updateOccupancyRecord = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { date, occupancyRate, occupiedRooms, totalRooms, revenue, totalGuests, averageStay, peakCheckInTime, roomTypeBreakdown } = req.body;

    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);

    let record = await OccupancyAnalytics.findOneAndUpdate(
      { hotel: hotelId, date: recordDate },
      {
        occupancyRate,
        occupiedRooms,
        totalRooms,
        revenue,
        totalGuests,
        averageStay,
        peakCheckInTime,
        roomTypeBreakdown
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: 'success',
      data: record,
      message: 'Occupancy record updated successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Recalculate occupancy from bookings and rooms
const recalculateOccupancy = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // Get all rooms for hotel
    const rooms = await Room.find({ hotel: hotelId });
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Get revenue for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const transactions = await Transaction.find({
      hotel: hotelId,
      timestamp: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });

    const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Get guest count
    const bookings = await Booking.find({
      hotel: hotelId,
      checkInDate: { $lte: tomorrow },
      checkOutDate: { $gte: today }
    });

    const totalGuests = bookings.reduce((sum, b) => sum + (b.numberOfGuests || 1), 0);
    const averageStay = bookings.length > 0 
      ? bookings.reduce((sum, b) => sum + (b.numberOfNights || 1), 0) / bookings.length
      : 0;

    // Get room type breakdown
    const roomTypeBreakdown = [];
    const roomTypes = [...new Set(rooms.map(r => r.roomType))];
    for (const type of roomTypes) {
      const typeRooms = rooms.filter(r => r.roomType === type);
      const typeOccupied = typeRooms.filter(r => r.status === 'occupied').length;
      roomTypeBreakdown.push({
        roomType: type,
        total: typeRooms.length,
        occupied: typeOccupied,
        occupancyRate: typeRooms.length > 0 ? Math.round((typeOccupied / typeRooms.length) * 100) : 0
      });
    }

    // Create/update record
    const recordDate = new Date(today);
    const record = await OccupancyAnalytics.findOneAndUpdate(
      { hotel: hotelId, date: recordDate },
      {
        occupancyRate,
        occupiedRooms,
        totalRooms,
        revenue,
        totalGuests,
        averageStay,
        roomTypeBreakdown
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: 'success',
      data: record,
      message: 'Occupancy recalculated successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export {
  getAnalyticsStats,
  getOccupancyTrend,
  getRevenueTrend,
  getOccupancyData,
  updateOccupancyRecord,
  recalculateOccupancy
};
