import Room from "../models/Room.js";

// Helper function to calculate discounted price
const calculateDiscountedPrice = (basePrice, discountPercentage) => {
  if (!discountPercentage || discountPercentage === 0) return null;
  return Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;
};

// Get all rooms for a hotel
const getAllRooms = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, roomType, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (status) filter.status = status;
    if (roomType) filter.roomType = roomType;

    const skip = (page - 1) * limit;
    const rooms = await Room.find(filter)
      .populate("hotel", "name")
      .populate("currentGuest", "name email")
      .populate("smartLockDevice", "deviceId deviceType tuyaDeviceId ttlockDeviceId status")
      .populate("doorSensorDevice", "deviceId deviceType tuyaDeviceId ttlockDeviceId status")
      .limit(limit * 1)
      .skip(skip)
      .sort({ roomNumber: 1 });

    const total = await Room.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: rooms,
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

// Get room by ID
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id)
      .populate("hotel", "name")
      .populate("currentGuest", "name email phone")
      .populate("smartLockDevice", "deviceId deviceType tuyaDeviceId status")
      .populate("doorSensorDevice", "deviceId deviceType tuyaDeviceId status");

    if (!room) return res.status(404).json({ status: "failed", message: "Room not found" });

    return res.status(200).json({ status: "success", data: room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Create new room
const createRoom = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { roomNumber, roomType, capacity, floor, pricePerNight, discountPercentage, ...rest } = req.body;

    if (!roomNumber || !roomType || !capacity || !pricePerNight) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    const existingRoom = await Room.findOne({ hotel: hotelId, roomNumber });
    if (existingRoom) {
      return res.status(400).json({ status: "failed", message: "Room number already exists" });
    }

    // Calculate discounted price if discount is provided
    const discountedPrice = calculateDiscountedPrice(pricePerNight, discountPercentage);

    const room = new Room({
      hotel: hotelId,
      roomNumber,
      roomType,
      capacity,
      floor,
      pricePerNight,
      discountPercentage: discountPercentage || 0,
      discountedPrice,
      ...rest
    });

    await room.save();
    await room.populate("hotel", "name");

    return res.status(201).json({
      status: "success",
      message: "Room created successfully",
      data: room
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Calculate discounted price if price or discount is being updated
    if (updates.pricePerNight || updates.discountPercentage) {
      const room = await Room.findById(id);
      const basePrice = updates.pricePerNight || room.pricePerNight;
      const discountPercentage = updates.discountPercentage !== undefined ? updates.discountPercentage : room.discountPercentage;

      updates.discountedPrice = calculateDiscountedPrice(basePrice, discountPercentage);
      if (updates.discountPercentage === undefined && room.discountPercentage) {
        updates.discountPercentage = room.discountPercentage;
      }
    }

    const room = await Room.findByIdAndUpdate(id, updates, { new: true })
      .populate("hotel", "name")
      .populate("currentGuest", "name email")
      .populate("smartLockDevice", "deviceId deviceType tuyaDeviceId status")
      .populate("doorSensorDevice", "deviceId deviceType tuyaDeviceId status");

    if (!room) return res.status(404).json({ status: "failed", message: "Room not found" });

    return res.status(200).json({
      status: "success",
      message: "Room updated successfully",
      data: room
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findByIdAndDelete(id);
    if (!room) return res.status(404).json({ status: "failed", message: "Room not found" });

    return res.status(200).json({
      status: "success",
      message: "Room deleted successfully",
      data: room
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// Update room status
const updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["available", "occupied", "maintenance", "reserved", "cleaning"].includes(status)) {
      return res.status(400).json({ status: "failed", message: "Invalid status" });
    }

    const room = await Room.findByIdAndUpdate(id, { status }, { new: true });
    if (!room) return res.status(404).json({ status: "failed", message: "Room not found" });

    return res.status(200).json({
      status: "success",
      message: "Room status updated",
      data: room
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus
};
