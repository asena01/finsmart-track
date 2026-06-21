import StaffActivityLog from '../models/StaffActivityLog.js';
import Staff from '../models/Staff.js';

// Get all activity logs for a hotel
const getAllActivityLogs = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { action, status, staffId, page = 1, limit = 20 } = req.query;

    let filter = { hotel: hotelId };
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (staffId) filter.staff = staffId;

    const skip = (page - 1) * limit;
    const logs = await StaffActivityLog.find(filter)
      .populate('staff', 'name position email')
      .limit(limit * 1)
      .skip(skip)
      .sort({ timestamp: -1 });

    const total = await StaffActivityLog.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      data: logs,
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

// Get activity statistics
const getActivityStats = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allLogs = await StaffActivityLog.find({ hotel: hotelId });
    const todayLogs = await StaffActivityLog.find({
      hotel: hotelId,
      timestamp: { $gte: today }
    });

    // Get staff with check-in status
    const staffData = await Staff.find({ hotel: hotelId });
    const activeStaff = staffData.filter(s => s.status === 'active').length;

    // Count check-ins and check-outs
    const checkedIn = await StaffActivityLog.countDocuments({
      hotel: hotelId,
      action: 'check-in',
      timestamp: { $gte: today }
    });

    const checkedOut = await StaffActivityLog.countDocuments({
      hotel: hotelId,
      action: 'check-out',
      timestamp: { $gte: today }
    });

    const stats = {
      totalActions: allLogs.length,
      actionsToday: todayLogs.length,
      activeStaff: activeStaff,
      checkedIn: checkedIn,
      checkedOut: checkedOut
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

// Create activity log
const createActivityLog = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { staff, staffName, staffPosition, action, description, status, relatedEntity, relatedEntityId } = req.body;

    if (!staff || !action || !description) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }

    // Get staff details if not provided
    let finalStaffName = staffName;
    let finalStaffPosition = staffPosition;

    if (!staffName || !staffPosition) {
      const staffData = await Staff.findById(staff);
      if (staffData) {
        finalStaffName = staffData.name;
        finalStaffPosition = staffData.position;
      }
    }

    const log = new StaffActivityLog({
      hotel: hotelId,
      staff,
      staffName: finalStaffName,
      staffPosition: finalStaffPosition,
      action,
      description,
      status: status || 'success',
      relatedEntity,
      relatedEntityId
    });

    await log.save();
    await log.populate('staff', 'name position email');

    return res.status(201).json({
      status: 'success',
      data: log,
      message: 'Activity log created successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Get activity log by ID
const getActivityLogById = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const log = await StaffActivityLog.findOne({ _id: id, hotel: hotelId })
      .populate('staff', 'name position email phone');

    if (!log) {
      return res.status(404).json({ status: 'failed', message: 'Activity log not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: log
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// Delete activity log
const deleteActivityLog = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const log = await StaffActivityLog.findOneAndDelete({ _id: id, hotel: hotelId });

    if (!log) {
      return res.status(404).json({ status: 'failed', message: 'Activity log not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Activity log deleted successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export {
  getAllActivityLogs,
  getActivityStats,
  createActivityLog,
  getActivityLogById,
  deleteActivityLog
};
