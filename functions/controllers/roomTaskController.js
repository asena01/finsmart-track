import Room from '../models/Room.js';
import RoomTask from '../models/RoomTask.js';
import Staff from '../models/Staff.js';
import FoodOrder from '../models/FoodOrder.js';
import Booking from '../models/Booking.js';
import { buildTaskTitle, syncRoomStatusForTask, upsertSourceTask } from '../services/roomTaskService.js';

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const isStaffEligibleForTask = (staff, taskType, serviceCategory = '') => {
  const position = normalizeValue(staff?.position);
  const department = normalizeValue(staff?.department);
  const accessRole = normalizeValue(staff?.accessRole);
  const category = normalizeValue(serviceCategory);

  const isManager = position === 'manager' || accessRole === 'admin' || accessRole === 'operations';
  if (isManager) {
    return true;
  }

  if (taskType === 'maintenance') {
    return position === 'maintenance' || department === 'maintenance' || accessRole === 'maintenance';
  }

  if (taskType === 'room-service-delivery') {
    return ['waiter', 'chef', 'bellboy'].includes(position) ||
      ['restaurant', 'kitchen'].includes(department) ||
      accessRole === 'food-service';
  }

  if (taskType === 'hotel-service-request') {
    if (category === 'laundry') {
      return ['housekeeping', 'housekeeper', 'receptionist', 'bellboy'].includes(position) ||
        ['housekeeping', 'front-office'].includes(department) ||
        ['housekeeping', 'front-desk'].includes(accessRole);
    }

    if (['massage', 'spa', 'gym', 'shuttle', 'service'].includes(category)) {
      return ['receptionist', 'bellboy'].includes(position) ||
        department === 'front-office' ||
        accessRole === 'front-desk';
    }
  }

  return ['housekeeping', 'housekeeper'].includes(position) ||
    department === 'housekeeping' ||
    accessRole === 'housekeeping';
};

const resolveEligibleStaff = async (hotelId, staffId, taskType, serviceCategory = '') => {
  const staff = await Staff.findOne({ _id: staffId, hotel: hotelId, status: 'active' }).select('name position department accessRole');
  if (!staff) {
    return { error: 'Staff member not found' };
  }

  if (!isStaffEligibleForTask(staff, taskType, serviceCategory)) {
    return { error: 'Selected staff member is not eligible for this task type' };
  }

  return { staff };
};

const getAllRoomTasks = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, taskType, assignedStaff, page = 1, limit = 10 } = req.query;

    const filter = { hotel: hotelId };
    if (status) filter.status = status;
    if (taskType) filter.taskType = taskType;
    if (assignedStaff) filter.assignedStaff = assignedStaff;

    const skip = (Number(page) - 1) * Number(limit);
    const tasks = await RoomTask.find(filter)
      .populate('room', 'roomNumber floor status')
      .populate('booking', 'bookingNumber checkOutDate status')
      .populate('assignedStaff', 'name position department')
      .limit(Number(limit))
      .skip(skip)
      .sort({ scheduledDate: -1, createdAt: -1 });

    const total = await RoomTask.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      data: tasks,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const createRoomTask = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      roomId,
      taskType,
      title,
      description,
      priority,
      scheduledDate,
      dueAt,
      assignedStaff,
      assignedBy,
      assignedByName,
      bookingId
    } = req.body;

    if (!roomId || !taskType || !scheduledDate) {
      return res.status(400).json({ status: 'failed', message: 'roomId, taskType, and scheduledDate are required' });
    }

    const room = await Room.findOne({ _id: roomId, hotel: hotelId });
    if (!room) {
      return res.status(404).json({ status: 'failed', message: 'Room not found' });
    }

    let assignedStaffName;
    if (assignedStaff) {
      const resolved = await resolveEligibleStaff(hotelId, assignedStaff, taskType);
      if (resolved.error) {
        return res.status(400).json({ status: 'failed', message: resolved.error });
      }
      assignedStaffName = resolved.staff.name;
    }

    const task = await RoomTask.create({
      hotel: hotelId,
      room: room._id,
      roomNumber: room.roomNumber,
      booking: bookingId || undefined,
      taskType,
      title: title || buildTaskTitle(taskType, room.roomNumber),
      description: description || '',
      priority: priority || 'medium',
      status: assignedStaff ? 'assigned' : 'open',
      source: 'manual',
      scheduledDate,
      dueAt: dueAt || scheduledDate,
      assignedStaff: assignedStaff || undefined,
      assignedStaffName,
      assignedBy: assignedBy || undefined,
      assignedByName: assignedByName || undefined
    });

    await syncRoomStatusForTask(task);
    await task.populate('assignedStaff', 'name position department');
    await task.populate('room', 'roomNumber floor status');

    return res.status(201).json({
      status: 'success',
      message: 'Room task created successfully',
      data: task
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const assignRoomTask = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { assignedStaffId, assignedBy, assignedByName } = req.body;

    const task = await RoomTask.findOne({ _id: id, hotel: hotelId });
    if (!task) {
      return res.status(404).json({ status: 'failed', message: 'Room task not found' });
    }

    if (!assignedStaffId) {
      task.assignedStaff = undefined;
      task.assignedStaffName = undefined;
      task.status = 'open';
    } else {
      const resolved = await resolveEligibleStaff(hotelId, assignedStaffId, task.taskType);
      if (resolved.error) {
        return res.status(400).json({ status: 'failed', message: resolved.error });
      }

      const staff = resolved.staff;
      task.assignedStaff = staff._id;
      task.assignedStaffName = staff.name;
      if (task.status === 'open') {
        task.status = 'assigned';
      }
    }

    task.assignedBy = assignedBy || task.assignedBy;
    task.assignedByName = assignedByName || task.assignedByName;
    await task.save();
    await syncRoomStatusForTask(task);
    await task.populate('assignedStaff', 'name position department');

    return res.status(200).json({
      status: 'success',
      message: 'Room task assignment updated',
      data: task
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const updateRoomTaskStatus = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { status, completionNotes } = req.body;

    if (!['open', 'assigned', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid task status' });
    }

    const task = await RoomTask.findOne({ _id: id, hotel: hotelId });
    if (!task) {
      return res.status(404).json({ status: 'failed', message: 'Room task not found' });
    }

    task.status = status;
    if (status === 'in-progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (completionNotes !== undefined) {
      task.completionNotes = completionNotes;
    }
    if (status === 'completed') {
      const completedAt = new Date();
      task.completedAt = completedAt;
      if (!task.startedAt) {
        task.startedAt = completedAt;
      }
      const durationMs = completedAt.getTime() - new Date(task.startedAt).getTime();
      task.actualDurationMinutes = Math.max(1, Math.round(durationMs / 60000));
    } else if (status !== 'completed') {
      task.completedAt = undefined;
      if (status !== 'in-progress') {
        task.actualDurationMinutes = undefined;
      }
    }
    await task.save();
    await syncRoomStatusForTask(task);
    await task.populate('assignedStaff', 'name position department');
    await task.populate('room', 'roomNumber floor status');

    return res.status(200).json({
      status: 'success',
      message: 'Room task status updated',
      data: task
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const getMyRoomTasks = async (req, res) => {
  try {
    const { hotelId, staffId } = req.params;
    const { status } = req.query;

    const filter = { hotel: hotelId, assignedStaff: staffId };
    if (status) {
      filter.status = status;
    }

    const tasks = await RoomTask.find(filter)
      .populate('room', 'roomNumber floor status')
      .populate('booking', 'bookingNumber checkOutDate status')
      .sort({ priority: -1, scheduledDate: 1, createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: tasks
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const upsertSourceLinkedTask = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      sourceType,
      sourceId,
      taskType,
      title,
      description,
      priority,
      assignedStaffId,
      assignedBy,
      assignedByName
    } = req.body;

    if (!sourceType || !sourceId || !taskType) {
      return res.status(400).json({ status: 'failed', message: 'sourceType, sourceId, and taskType are required' });
    }

    let room = null;
    let roomNumber = 'TBA';
    let booking = null;
    let sourceLabel = '';
    let serviceCategory = '';

    if (sourceType === 'food-order') {
      const order = await FoodOrder.findOne({ _id: sourceId, hotel: hotelId }).select('roomNumber orderId guestName orderTime');
      if (order) {
        roomNumber = order.roomNumber;
        sourceLabel = order.orderId;
        const matchedRoom = await Room.findOne({ hotel: hotelId, roomNumber: order.roomNumber }).select('_id roomNumber');
        room = matchedRoom?._id || null;
      } else {
        const matchedBooking = await Booking.findOne({
          hotel: hotelId,
          'roomServiceOrders._id': sourceId
        }).populate('room', 'roomNumber');

        if (!matchedBooking) {
          return res.status(404).json({ status: 'failed', message: 'Food order not found' });
        }

        const embeddedOrder = matchedBooking.roomServiceOrders.id(sourceId) ||
          matchedBooking.roomServiceOrders.find((item) => item._id?.toString() === sourceId);

        room = matchedBooking.room?._id || matchedBooking.room || null;
        roomNumber = matchedBooking.room?.roomNumber || matchedBooking.roomNumber || 'TBA';
        booking = matchedBooking._id;
        sourceLabel = `RS-${sourceId.toString().slice(-8).toUpperCase()}`;
      }
    } else if (sourceType === 'hotel-service-order') {
      const matchedBooking = await Booking.findOne({
        hotel: hotelId,
        'hotelServiceOrders._id': sourceId
      }).populate('room', 'roomNumber');

      if (!matchedBooking) {
        return res.status(404).json({ status: 'failed', message: 'Hotel service order not found' });
      }

      const order = matchedBooking.hotelServiceOrders.id(sourceId) ||
        matchedBooking.hotelServiceOrders.find((item) => item._id?.toString() === sourceId);

        room = matchedBooking.room?._id || matchedBooking.room || null;
        roomNumber = matchedBooking.room?.roomNumber || matchedBooking.roomNumber || 'TBA';
        booking = matchedBooking._id;
        sourceLabel = order?.name || 'Hotel service';
        serviceCategory = order?.category || '';
    } else {
      return res.status(400).json({ status: 'failed', message: 'Unsupported sourceType' });
    }

    let assignedStaff = undefined;
    let assignedStaffName = undefined;
    if (assignedStaffId) {
      const resolved = await resolveEligibleStaff(hotelId, assignedStaffId, taskType, serviceCategory);
      if (resolved.error) {
        return res.status(400).json({ status: 'failed', message: resolved.error });
      }
      const staff = resolved.staff;
      assignedStaff = staff._id;
      assignedStaffName = staff.name;
    }

    const task = await upsertSourceTask({
      hotel: hotelId,
      room,
      roomNumber,
      booking,
      taskType,
      sourceType,
      sourceId,
      sourceLabel,
      title: title || buildTaskTitle(taskType, roomNumber),
      description: description || '',
      priority: priority || 'medium',
      scheduledDate: new Date(),
      assignedStaff,
      assignedStaffName,
      assignedBy,
      assignedByName
    });

    await task.populate('assignedStaff', 'name position department');

    return res.status(200).json({
      status: 'success',
      message: 'Source task linked successfully',
      data: task
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export {
  getAllRoomTasks,
  createRoomTask,
  assignRoomTask,
  updateRoomTaskStatus,
  getMyRoomTasks,
  upsertSourceLinkedTask
};
