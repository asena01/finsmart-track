import Room from '../models/Room.js';
import RoomTask from '../models/RoomTask.js';

const buildTaskTitle = (taskType, roomNumber) => {
  const labels = {
    'checkout-cleaning': `Checkout cleaning for room ${roomNumber}`,
    'stayover-cleaning': `Stayover cleaning for room ${roomNumber}`,
    'deep-cleaning': `Deep cleaning for room ${roomNumber}`,
    maintenance: `Maintenance for room ${roomNumber}`,
    inspection: `Inspection for room ${roomNumber}`,
    'minibar-restock': `Minibar restock for room ${roomNumber}`,
    'room-service-delivery': `Room service delivery for room ${roomNumber}`,
    'hotel-service-request': `Guest service request for room ${roomNumber}`
  };

  return labels[taskType] || `Room task for room ${roomNumber}`;
};

const syncRoomStatusForTask = async (task) => {
  if (!task?.room) {
    return;
  }

  if (!['checkout-cleaning', 'stayover-cleaning', 'deep-cleaning', 'maintenance', 'inspection', 'minibar-restock'].includes(task.taskType)) {
    return;
  }

  const room = await Room.findById(task.room).select('status currentGuest checkOutDate');
  if (!room) {
    return;
  }

  const openTasks = await RoomTask.find({
    room: task.room,
    status: { $in: ['open', 'assigned', 'in-progress'] }
  }).select('taskType');

  if (openTasks.some((item) => item.taskType === 'maintenance')) {
    await Room.findByIdAndUpdate(task.room, { status: 'maintenance' });
    return;
  }

  if (openTasks.length > 0) {
    await Room.findByIdAndUpdate(task.room, { status: 'cleaning' });
    return;
  }

  if (room.currentGuest || room.status === 'occupied' || room.status === 'reserved') {
    return;
  }

  await Room.findByIdAndUpdate(task.room, { status: 'available' });
};

const ensureCheckoutCleaningTask = async (booking) => {
  if (!booking?.hotel || !booking?.room || booking.status !== 'checked-out') {
    return null;
  }

  const existingTask = await RoomTask.findOne({
    booking: booking._id,
    taskType: 'checkout-cleaning',
    source: 'checkout',
    status: { $ne: 'cancelled' }
  });

  if (existingTask) {
    await syncRoomStatusForTask(existingTask);
    return existingTask;
  }

  const room = booking.roomNumber
    ? { _id: booking.room, roomNumber: booking.roomNumber }
    : await Room.findById(booking.room).select('roomNumber');

  if (!room) {
    return null;
  }

  const task = await RoomTask.create({
    hotel: booking.hotel,
    room: room._id,
    roomNumber: room.roomNumber,
    booking: booking._id,
    taskType: 'checkout-cleaning',
    title: buildTaskTitle('checkout-cleaning', room.roomNumber),
    description: 'Auto-created after guest checkout so housekeeping can prepare the room.',
    priority: 'high',
    status: 'open',
    source: 'checkout',
    scheduledDate: new Date(),
    dueAt: new Date()
  });

  await syncRoomStatusForTask(task);
  return task;
};

const upsertSourceTask = async ({
  hotel,
  room,
  roomNumber,
  booking,
  taskType,
  sourceType,
  sourceId,
  sourceLabel,
  title,
  description,
  priority = 'medium',
  scheduledDate,
  dueAt,
  assignedStaff,
  assignedStaffName,
  assignedBy,
  assignedByName
}) => {
  const existingTask = await RoomTask.findOne({
    hotel,
    sourceType,
    sourceId,
    status: { $ne: 'cancelled' }
  });

  if (existingTask) {
    existingTask.room = room || existingTask.room;
    existingTask.roomNumber = roomNumber || existingTask.roomNumber;
    existingTask.booking = booking || existingTask.booking;
    existingTask.taskType = taskType || existingTask.taskType;
    existingTask.sourceLabel = sourceLabel || existingTask.sourceLabel;
    existingTask.title = title || existingTask.title;
    existingTask.description = description ?? existingTask.description;
    existingTask.priority = priority || existingTask.priority;
    existingTask.scheduledDate = scheduledDate || existingTask.scheduledDate;
    existingTask.dueAt = dueAt || existingTask.dueAt;
    if (assignedStaff !== undefined) {
      existingTask.assignedStaff = assignedStaff || undefined;
      existingTask.assignedStaffName = assignedStaffName || undefined;
      existingTask.status = assignedStaff ? (existingTask.status === 'completed' ? 'completed' : 'assigned') : 'open';
    }
    existingTask.assignedBy = assignedBy || existingTask.assignedBy;
    existingTask.assignedByName = assignedByName || existingTask.assignedByName;
    await existingTask.save();
    await syncRoomStatusForTask(existingTask);
    return existingTask;
  }

  const task = await RoomTask.create({
    hotel,
    room: room || undefined,
    roomNumber,
    booking: booking || undefined,
    taskType,
    sourceType,
    sourceId,
    sourceLabel: sourceLabel || '',
    title,
    description,
    priority,
    status: assignedStaff ? 'assigned' : 'open',
    source: sourceType === 'food-order' ? 'food-order' : sourceType === 'hotel-service-order' ? 'hotel-service-order' : 'manual',
    scheduledDate,
    dueAt: dueAt || scheduledDate,
    assignedStaff: assignedStaff || undefined,
    assignedStaffName: assignedStaffName || undefined,
    assignedBy: assignedBy || undefined,
    assignedByName: assignedByName || undefined
  });

  await syncRoomStatusForTask(task);
  return task;
};

export {
  buildTaskTitle,
  ensureCheckoutCleaningTask,
  syncRoomStatusForTask,
  upsertSourceTask
};
