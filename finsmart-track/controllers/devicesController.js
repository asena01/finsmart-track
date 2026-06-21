import Device from "../models/Device.js";

const getAllDevices = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, deviceType, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (status !== undefined) filter.status = status === 'true';
    if (deviceType) filter.deviceType = deviceType;

    const skip = (page - 1) * limit;
    const devices = await Device.find(filter)
      .populate("hotel", "name")
      .populate("room", "roomNumber roomType")
      .limit(limit * 1)
      .skip(skip)
      .sort({ roomNumber: 1 });

    const total = await Device.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: devices,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findById(id)
      .populate("hotel", "name")
      .populate("room", "roomNumber roomType");

    if (!device) return res.status(404).json({ status: "failed", message: "Device not found" });

    return res.status(200).json({ status: "success", data: device });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const registerDevices = async (req, res) => {
  try {
    const devices = req.body;
    if (!Array.isArray(devices) || !devices.length) {
      return res.status(400).json({ status: "failed", message: "No device data provided" });
    }

    const existingDeviceIds = await Device.find({ deviceId: { $in: devices.map(d => d.deviceId) } }).select("deviceId");
    const existingSet = new Set(existingDeviceIds.map(d => d.deviceId));

    const devicesToInsert = devices.filter(d => !existingSet.has(d.deviceId));
    if (!devicesToInsert.length) {
      return res.status(400).json({ status: "failed", message: "All provided devices already exist" });
    }

    const deviceData = devicesToInsert.map(d => ({
      deviceId: d.deviceId,
      hotel: d.hotel || null,
      roomNumber: d.roomNumber || null,
      status: d.status || false,
      deviceType: d.deviceType || 'motion_sensor'
    }));

    const savedDevices = await Device.insertMany(deviceData);

    return res.status(201).json({
      status: "success",
      message: "Devices registered successfully",
      data: savedDevices
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const createDevice = async (req, res) => {
  try {
    const { deviceId, hotelId, roomNumber, status, ...rest } = req.body;

    if (!deviceId) {
      return res.status(400).json({ status: "failed", message: "Device ID is required" });
    }

    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ status: "failed", message: "Device ID already exists" });
    }

    const device = new Device({
      deviceId,
      hotel: hotelId || null,
      roomNumber,
      status: status || false,
      ...rest
    });

    await device.save();
    await device.populate("hotel", "name");

    return res.status(201).json({
      status: "success",
      message: "Device created successfully",
      data: device
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const device = await Device.findByIdAndUpdate(id, updates, { new: true })
      .populate("hotel", "name")
      .populate("room", "roomNumber roomType");

    if (!device) return res.status(404).json({ status: "failed", message: "Device not found" });

    return res.status(200).json({
      status: "success",
      message: "Device updated successfully",
      data: [device]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateDeviceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const device = await Device.findByIdAndUpdate(id, { status }, { new: true });
    if (!device) return res.status(404).json({ status: "failed", message: "Device not found" });

    return res.status(200).json({
      status: "success",
      message: "Device status updated",
      data: device
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const removeDevices = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ status: "failed", message: "No device IDs provided" });
    }

    const deleted = await Device.deleteMany({ _id: { $in: ids } });
    if (!deleted.deletedCount) {
      return res.status(404).json({ status: "failed", message: "No devices found for the given IDs" });
    }

    return res.status(200).json({
      status: "success",
      message: "Devices deleted successfully",
      data: { deletedCount: deleted.deletedCount }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllDevices,
  getDeviceById,
  registerDevices,
  createDevice,
  updateDevice,
  updateDeviceStatus,
  removeDevices
};
