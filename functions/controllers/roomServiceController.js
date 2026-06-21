import RoomServiceMenuItem from "../models/RoomServiceMenuItem.js";

// Helper function to calculate discounted price
const calculateDiscountedPrice = (basePrice, discountPercentage) => {
  if (!discountPercentage || discountPercentage === 0) return null;
  return Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;
};

const getAllItems = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { category, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId, isActive: true };
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const items = await RoomServiceMenuItem.find(filter)
      .limit(limit * 1)
      .skip(skip)
      .sort({ category: 1, name: 1 });

    const total = await RoomServiceMenuItem.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: items,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await RoomServiceMenuItem.findById(id);

    if (!item) return res.status(404).json({ status: "failed", message: "Menu item not found" });

    return res.status(200).json({ status: "success", data: item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const createItem = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { name, category, price, description, discountPercentage, ...rest } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    // Calculate discounted price if discount is provided
    const discountedPrice = calculateDiscountedPrice(price, discountPercentage);

    const item = new RoomServiceMenuItem({
      hotel: hotelId,
      name,
      category,
      price,
      description,
      discountPercentage: discountPercentage || 0,
      discountedPrice,
      ...rest
    });

    await item.save();

    return res.status(201).json({
      status: "success",
      message: "Menu item created successfully",
      data: item
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Calculate discounted price if price or discount is being updated
    if (updates.price || updates.discountPercentage !== undefined) {
      const item = await RoomServiceMenuItem.findById(id);
      const basePrice = updates.price || item.price;
      const discountPercentage = updates.discountPercentage !== undefined ? updates.discountPercentage : item.discountPercentage;

      updates.discountedPrice = calculateDiscountedPrice(basePrice, discountPercentage);
      if (updates.discountPercentage === undefined) {
        updates.discountPercentage = item.discountPercentage;
      }
    }

    const item = await RoomServiceMenuItem.findByIdAndUpdate(id, updates, { new: true });

    if (!item) return res.status(404).json({ status: "failed", message: "Menu item not found" });

    return res.status(200).json({
      status: "success",
      message: "Menu item updated successfully",
      data: item
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await RoomServiceMenuItem.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ status: "failed", message: "Menu item not found" });

    return res.status(200).json({
      status: "success",
      message: "Menu item deleted",
      data: item
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await RoomServiceMenuItem.findById(id);

    if (!item) return res.status(404).json({ status: "failed", message: "Menu item not found" });

    item.available = !item.available;
    await item.save();

    return res.status(200).json({
      status: "success",
      message: `Item ${item.available ? "available" : "unavailable"}`,
      data: item
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  toggleAvailability
};
