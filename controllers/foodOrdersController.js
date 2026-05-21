import FoodOrder from "../models/FoodOrder.js";
import Booking from "../models/Booking.js";
import { emitOrderUpdate } from "../services/chatSocketService.js";

const deriveCategoryFromItems = (items = []) => {
  const drinkItems = ["juice", "coffee", "tea", "wine", "beer", "cola", "sprite", "water", "lemonade"];
  const drinkCount = items.filter((item) =>
    drinkItems.some((drink) => item.toLowerCase().includes(drink))
  ).length;

  if (drinkCount === 0) return "food";
  if (drinkCount === items.length) return "drink";
  return "mixed";
};

const getEmbeddedOrderItemName = (item) => {
  if (typeof item === "string") {
    return item;
  }

  if (item && typeof item === "object") {
    if (typeof item.name === "string") {
      return item.name;
    }
    if (typeof item.itemName === "string") {
      return item.itemName;
    }
    if (typeof item.title === "string") {
      return item.title;
    }
  }

  return "";
};

const getAllFoodOrders = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, category, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const directOrders = await FoodOrder.find(filter)
      .populate("guest", "name email phone")
      .populate("assignedStaff", "name position")
      .sort({ orderTime: -1 });

    const bookings = await Booking.find({
      hotel: hotelId,
      "roomServiceOrders.0": { $exists: true }
    })
      .populate("guest", "name email phone")
      .populate("room", "roomNumber roomType")
      .sort({ createdAt: -1 });

    const embeddedOrders = bookings.flatMap((booking) =>
      (booking.roomServiceOrders || [])
        .filter((order) => !status || order.status === status)
        .map((order) => {
          const items = (order.items || []).map(getEmbeddedOrderItemName).filter(Boolean);
          const mappedCategory = deriveCategoryFromItems(items);
          return {
            _id: order._id,
            orderId: `RS-${order._id.toString().slice(-8).toUpperCase()}`,
            roomNumber: booking.room?.roomNumber || "TBA",
            guestName: booking.guest?.name || "Unknown Guest",
            guest: booking.guest,
            items,
            totalPrice: order.totalPrice || 0,
            status: order.status,
            category: mappedCategory,
            assignedStaff: null,
            orderTime: order.orderedAt,
            specialInstructions: order.notes || "",
            bookingId: booking._id,
            sourceType: "room-service-order"
          };
        })
        .filter((order) => !category || order.category === category)
    );

    const allOrders = [...directOrders.map((order) => ({ ...order.toObject(), sourceType: "food-order" })), ...embeddedOrders]
      .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());

    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const skip = (pageNumber - 1) * pageSize;
    const paginatedOrders = allOrders.slice(skip, skip + pageSize);
    const total = allOrders.length;

    return res.status(200).json({
      status: "success",
      data: paginatedOrders,
      pagination: { total, pages: Math.ceil(total / pageSize), currentPage: pageNumber }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getFoodOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await FoodOrder.findById(id)
      .populate("guest", "name email phone")
      .populate("assignedStaff", "name position");

    if (!order) return res.status(404).json({ status: "failed", message: "Food order not found" });

    return res.status(200).json({ status: "success", data: order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const createFoodOrder = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { roomNumber, guestName, items, totalPrice, category, ...rest } = req.body;

    if (!roomNumber || !guestName || !items || !totalPrice) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    // Auto-categorize if not provided
    let orderCategory = category;
    if (!orderCategory && items.length > 0) {
      orderCategory = deriveCategoryFromItems(items);
    }

    const orderId = "FO-" + Date.now().toString().slice(-10);
    const prepTime = rest.preparationTime || 20;
    const estimatedDeliveryTime = new Date(Date.now() + prepTime * 60000);

    const order = new FoodOrder({
      hotel: hotelId,
      orderId,
      roomNumber,
      guestName,
      items,
      totalPrice,
      category: orderCategory || "mixed",
      preparationTime: prepTime,
      estimatedDeliveryTime,
      ...rest
    });

    await order.save();
    await order.populate("guest", "name email phone");

    return res.status(201).json({
      status: "success",
      message: "Food order created successfully",
      data: order
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateFoodOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const order = await FoodOrder.findByIdAndUpdate(id, updates, { new: true })
      .populate("guest", "name email phone")
      .populate("assignedStaff", "name position");

    if (!order) return res.status(404).json({ status: "failed", message: "Food order not found" });

    return res.status(200).json({
      status: "success",
      message: "Food order updated successfully",
      data: order
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateFoodOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "preparing", "ready", "dispatched", "delivering", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ status: "failed", message: "Invalid status" });
    }

    const updates = { status };
    const now = new Date();

    if (status === "preparing") updates.prepStartTime = now;
    else if (status === "ready") {
      updates.prepEndTime = now;
      updates.readyAt = now;
    }
    else if (status === "dispatched") {
      updates.dispatchedAt = now;
      updates.deliveryStartTime = now;
    }
    else if (status === "delivering") updates.deliveryStartTime = now;
    else if (status === "delivered") {
      updates.deliveryEndTime = now;
      updates.deliveredAt = now;
    }

    const order = await FoodOrder.findByIdAndUpdate(id, updates, { new: true });
    if (order) {
      emitOrderUpdate(order);
      return res.status(200).json({
        status: "success",
        message: "Food order status updated",
        data: order
      });
    }

    const booking = await Booking.findOne({ "roomServiceOrders._id": id });
    if (!booking) {
      return res.status(404).json({ status: "failed", message: "Food order not found" });
    }

    const embeddedOrder = booking.roomServiceOrders.id(id) ||
      booking.roomServiceOrders.find((item) => item._id?.toString() === id);

    if (!embeddedOrder) {
      return res.status(404).json({ status: "failed", message: "Food order not found" });
    }

    if (!["pending", "preparing", "ready", "dispatched", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ status: "failed", message: "Invalid room service order status" });
    }

    embeddedOrder.status = status;
    if (status === "ready") {
      embeddedOrder.etaAt = now;
      embeddedOrder.readyAt = now;
    }
    if (status === "dispatched") {
      embeddedOrder.dispatchedAt = now;
    }
    if (status === "delivered") {
      embeddedOrder.deliveredAt = now;
    }
    await booking.save();

    // Mock an order object for socket emission
    emitOrderUpdate({
      _id: embeddedOrder._id,
      guest: booking.guest,
      hotel: booking.hotel,
      status: embeddedOrder.status,
      readyAt: embeddedOrder.readyAt,
      dispatchedAt: embeddedOrder.dispatchedAt,
      deliveredAt: embeddedOrder.deliveredAt,
      updatedAt: now
    });

    return res.status(200).json({
      status: "success",
      message: "Food order status updated",
      data: embeddedOrder
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const deleteFoodOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await FoodOrder.findByIdAndDelete(id);
    if (!order) return res.status(404).json({ status: "failed", message: "Food order not found" });

    return res.status(200).json({
      status: "success",
      message: "Food order deleted",
      data: order
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllFoodOrders,
  getFoodOrderById,
  createFoodOrder,
  updateFoodOrder,
  updateFoodOrderStatus,
  deleteFoodOrder
};
