import FoodOrder from "../models/FoodOrder.js";
import Booking from "../models/Booking.js";
import { emitOrderUpdate } from "../services/chatSocketService.js";

const FOOD_ORDER_STATUSES = ["pending", "processing", "shipped", "dispatched", "delivered", "cancelled"];
const FOOD_ORDER_STATUS_ALIASES = {
  confirmed: "processing",
  preparing: "processing",
  ready: "shipped",
  "en-route": "dispatched",
  delivering: "dispatched",
  on_the_way: "dispatched",
  "in-transit": "dispatched"
};

const normalizeFoodOrderStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "";
  if (FOOD_ORDER_STATUS_ALIASES[normalized]) return FOOD_ORDER_STATUS_ALIASES[normalized];
  return FOOD_ORDER_STATUSES.includes(normalized) ? normalized : "";
};

const getStatusQueryValues = (status) => {
  const normalized = normalizeFoodOrderStatus(status);
  if (normalized === "processing") return ["processing", "preparing", "confirmed"];
  if (normalized === "shipped") return ["shipped", "ready"];
  if (normalized === "dispatched") return ["dispatched", "delivering", "en-route", "on_the_way", "in-transit"];
  return [normalized];
};

const getStatusTimestampUpdates = (status, now) => {
  if (status === "processing") return { prepStartTime: now };
  if (status === "shipped") return { prepEndTime: now, readyAt: now };
  if (status === "dispatched") return { dispatchedAt: now, deliveryStartTime: now };
  if (status === "delivered") return { deliveryEndTime: now, deliveredAt: now };
  return {};
};

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
    if (status) filter.status = { $in: getStatusQueryValues(status) };
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
        .filter((order) => !status || normalizeFoodOrderStatus(order.status) === normalizeFoodOrderStatus(status))
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
            status: normalizeFoodOrderStatus(order.status),
            category: mappedCategory,
            assignedStaff: null,
            orderTime: order.orderedAt,
            specialInstructions: order.notes || "",
            bookingId: booking._id,
            sourceType: "room-service-order"
          };
        })
        .filter((order) => !status || order.status === normalizeFoodOrderStatus(status))
        .filter((order) => !category || order.category === category)
    );

    const allOrders = [
      ...directOrders.map((order) => ({
        ...order.toObject(),
        status: normalizeFoodOrderStatus(order.status),
        sourceType: "food-order"
      })),
      ...embeddedOrders
    ]
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
    const { roomNumber, guestName, items, totalPrice, category, status, ...rest } = req.body;

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
    const normalizedStatus = status ? normalizeFoodOrderStatus(status) : "";

    if (status && !normalizedStatus) {
      return res.status(400).json({
        status: "failed",
        message: `Invalid status. Must be one of: ${FOOD_ORDER_STATUSES.join(", ")}`
      });
    }

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
      status: normalizedStatus || "pending",
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
    const updates = { ...req.body };

    if (updates.status) {
      const normalizedStatus = normalizeFoodOrderStatus(updates.status);
      if (!normalizedStatus) {
        return res.status(400).json({
          status: "failed",
          message: `Invalid status. Must be one of: ${FOOD_ORDER_STATUSES.join(", ")}`
        });
      }
      updates.status = normalizedStatus;
    }

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
    const normalizedStatus = normalizeFoodOrderStatus(status);

    if (!normalizedStatus) {
      return res.status(400).json({
        status: "failed",
        message: `Invalid status. Must be one of: ${FOOD_ORDER_STATUSES.join(", ")}`
      });
    }

    const now = new Date();
    const updates = { status: normalizedStatus, ...getStatusTimestampUpdates(normalizedStatus, now) };

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

    const embeddedOrderUpdates = {
      status: normalizedStatus,
      ...getStatusTimestampUpdates(normalizedStatus, now)
    };

    if (normalizedStatus === "shipped") {
      embeddedOrderUpdates.etaAt = now;
    }

    const prefixedUpdates = Object.fromEntries(
      Object.entries(embeddedOrderUpdates).map(([key, value]) => [`roomServiceOrders.$.${key}`, value])
    );

    const updateResult = await Booking.updateOne(
      { _id: booking._id, "roomServiceOrders._id": embeddedOrder._id },
      { $set: prefixedUpdates },
      { runValidators: false }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ status: "failed", message: "Food order not found" });
    }

    const updatedEmbeddedOrder = {
      ...(typeof embeddedOrder.toObject === "function" ? embeddedOrder.toObject() : embeddedOrder),
      ...embeddedOrderUpdates
    };

    // Mock an order object for socket emission
    emitOrderUpdate({
      _id: updatedEmbeddedOrder._id,
      guest: booking.guest,
      hotel: booking.hotel,
      status: updatedEmbeddedOrder.status,
      readyAt: updatedEmbeddedOrder.readyAt,
      etaAt: updatedEmbeddedOrder.etaAt,
      dispatchedAt: updatedEmbeddedOrder.dispatchedAt,
      deliveredAt: updatedEmbeddedOrder.deliveredAt,
      estimatedDurationMinutes: updatedEmbeddedOrder.estimatedDurationMinutes,
      orderedAt: updatedEmbeddedOrder.orderedAt,
      updatedAt: now
    });

    return res.status(200).json({
      status: "success",
      message: "Food order status updated",
      data: updatedEmbeddedOrder
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
