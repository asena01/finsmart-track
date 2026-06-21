import Maintenance from "../models/Maintenance.js";

const getAllMaintenance = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, priority, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (page - 1) * limit;
    const maintenance = await Maintenance.find(filter)
      .populate("room", "roomNumber")
      .populate("assignedTo", "name position")
      .limit(limit * 1)
      .skip(skip)
      .sort({ reportedDate: -1 });

    const total = await Maintenance.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: maintenance,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await Maintenance.findById(id)
      .populate("room", "roomNumber")
      .populate("assignedTo", "name position")
      .populate("reportedBy", "name email");

    if (!maintenance) return res.status(404).json({ status: "failed", message: "Maintenance request not found" });

    return res.status(200).json({ status: "success", data: maintenance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const createMaintenance = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { roomNumber, issue, category, priority, ...rest } = req.body;

    if (!roomNumber || !issue || !category) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    const maintenance = new Maintenance({
      hotel: hotelId,
      roomNumber,
      issue,
      category,
      priority: priority || "medium",
      ...rest
    });

    await maintenance.save();
    await maintenance.populate("assignedTo", "name position");

    return res.status(201).json({
      status: "success",
      message: "Maintenance request created successfully",
      data: maintenance
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const maintenance = await Maintenance.findByIdAndUpdate(id, updates, { new: true })
      .populate("room", "roomNumber")
      .populate("assignedTo", "name position");

    if (!maintenance) return res.status(404).json({ status: "failed", message: "Maintenance request not found" });

    return res.status(200).json({
      status: "success",
      message: "Maintenance updated successfully",
      data: maintenance
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateMaintenanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "in-progress", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ status: "failed", message: "Invalid status" });
    }

    const updates = { status };
    if (status === "completed") {
      updates.completionDate = new Date();
    }

    const maintenance = await Maintenance.findByIdAndUpdate(id, updates, { new: true });
    if (!maintenance) return res.status(404).json({ status: "failed", message: "Maintenance request not found" });

    return res.status(200).json({
      status: "success",
      message: "Maintenance status updated",
      data: maintenance
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await Maintenance.findByIdAndDelete(id);
    if (!maintenance) return res.status(404).json({ status: "failed", message: "Maintenance request not found" });

    return res.status(200).json({
      status: "success",
      message: "Maintenance request deleted",
      data: maintenance
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  updateMaintenanceStatus,
  deleteMaintenance
};
