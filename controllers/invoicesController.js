import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";

const getAllInvoices = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const invoices = await Invoice.find(filter)
      .populate("guest", "name email phone")
      .limit(limit * 1)
      .skip(skip)
      .sort({ issueDate: -1 });

    const total = await Invoice.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: invoices,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id).populate("guest", "name email phone");

    if (!invoice) return res.status(404).json({ status: "failed", message: "Invoice not found" });

    return res.status(200).json({ status: "success", data: invoice });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const createInvoice = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { guest, amount, items, ...rest } = req.body;

    if (!guest || !amount) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    const invoiceNumber = "INV-" + Date.now().toString().slice(-10);

    const invoice = new Invoice({
      hotel: hotelId,
      invoiceNumber,
      guest,
      amount,
      items: items || [],
      ...rest
    });

    await invoice.save();
    await invoice.populate("guest", "name email phone");

    return res.status(201).json({
      status: "success",
      message: "Invoice created successfully",
      data: invoice
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const invoice = await Invoice.findByIdAndUpdate(id, updates, { new: true })
      .populate("guest", "name email phone");

    if (!invoice) return res.status(404).json({ status: "failed", message: "Invoice not found" });

    return res.status(200).json({
      status: "success",
      message: "Invoice updated successfully",
      data: invoice
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["draft", "issued", "paid", "overdue", "cancelled"].includes(status)) {
      return res.status(400).json({ status: "failed", message: "Invalid status" });
    }

    const updates = { status };
    if (status === "paid") {
      updates.paidDate = new Date();
    }

    const invoice = await Invoice.findByIdAndUpdate(id, updates, { new: true });
    if (!invoice) return res.status(404).json({ status: "failed", message: "Invoice not found" });

    return res.status(200).json({
      status: "success",
      message: "Invoice status updated",
      data: invoice
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) return res.status(404).json({ status: "failed", message: "Invoice not found" });

    return res.status(200).json({
      status: "success",
      message: "Invoice deleted",
      data: invoice
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice
};
