import Menu from "../models/Menu.js";

// Helper function to calculate discounted price
const calculateDiscountedPrice = (basePrice, discountPercentage) => {
  if (!discountPercentage || discountPercentage === 0) return null;
  return Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;
};

const getAllMenus = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { type, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const menus = await Menu.find(filter)
      .limit(limit * 1)
      .skip(skip)
      .sort({ createdDate: -1 });

    const total = await Menu.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: menus,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id);

    if (!menu) return res.status(404).json({ status: "failed", message: "Menu not found" });

    return res.status(200).json({ status: "success", data: menu });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const createMenu = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { name, type, description, dishes = [] } = req.body;

    if (!name || !type) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    const menu = new Menu({
      hotel: hotelId,
      name,
      type,
      description,
      dishes,
      createdDate: new Date(),
      lastUpdated: new Date()
    });

    await menu.save();

    return res.status(201).json({
      status: "success",
      message: "Menu created successfully",
      data: menu
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    updates.lastUpdated = new Date();

    // If updating dishes, calculate discounted prices
    if (updates.dishes && Array.isArray(updates.dishes)) {
      updates.dishes = updates.dishes.map(dish => {
        if (dish.price && dish.discountPercentage !== undefined) {
          dish.discountedPrice = calculateDiscountedPrice(dish.price, dish.discountPercentage);
        }
        return dish;
      });
    }

    const menu = await Menu.findByIdAndUpdate(id, updates, { new: true });

    if (!menu) return res.status(404).json({ status: "failed", message: "Menu not found" });

    return res.status(200).json({
      status: "success",
      message: "Menu updated successfully",
      data: menu
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const addDishToMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, discountPercentage } = req.body;

    if (!name || !price) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    const menu = await Menu.findById(id);
    if (!menu) return res.status(404).json({ status: "failed", message: "Menu not found" });

    // Calculate discounted price if discount is provided
    const discountedPrice = calculateDiscountedPrice(price, discountPercentage);

    const dish = {
      id: Date.now().toString(),
      name,
      price,
      discountPercentage: discountPercentage || 0,
      discountedPrice
    };

    menu.dishes.push(dish);
    menu.lastUpdated = new Date();
    await menu.save();

    return res.status(200).json({
      status: "success",
      message: "Dish added to menu",
      data: menu
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateDishInMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { dishId, name, price, discountPercentage } = req.body;

    if (!dishId || !name || !price) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    const menu = await Menu.findById(id);
    if (!menu) return res.status(404).json({ status: "failed", message: "Menu not found" });

    const dishIndex = menu.dishes.findIndex(d => d.id === dishId);
    if (dishIndex === -1) {
      return res.status(404).json({ status: "failed", message: "Dish not found" });
    }

    // Calculate discounted price if discount is provided
    const discountedPrice = calculateDiscountedPrice(price, discountPercentage);

    menu.dishes[dishIndex] = {
      ...menu.dishes[dishIndex],
      name,
      price,
      discountPercentage: discountPercentage || 0,
      discountedPrice
    };

    menu.lastUpdated = new Date();
    await menu.save();

    return res.status(200).json({
      status: "success",
      message: "Dish updated in menu",
      data: menu
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const removeDishFromMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { dishId } = req.body;

    const menu = await Menu.findById(id);
    if (!menu) return res.status(404).json({ status: "failed", message: "Menu not found" });

    menu.dishes = menu.dishes.filter(d => d.id !== dishId);
    menu.lastUpdated = new Date();
    await menu.save();

    return res.status(200).json({
      status: "success",
      message: "Dish removed from menu",
      data: menu
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const toggleMenuActive = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id);

    if (!menu) return res.status(404).json({ status: "failed", message: "Menu not found" });

    menu.isActive = !menu.isActive;
    menu.lastUpdated = new Date();
    await menu.save();

    return res.status(200).json({
      status: "success",
      message: `Menu ${menu.isActive ? "activated" : "deactivated"}`,
      data: menu
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await Menu.findByIdAndDelete(id);
    if (!menu) return res.status(404).json({ status: "failed", message: "Menu not found" });

    return res.status(200).json({
      status: "success",
      message: "Menu deleted",
      data: menu
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  addDishToMenu,
  updateDishInMenu,
  removeDishFromMenu,
  toggleMenuActive,
  deleteMenu
};
