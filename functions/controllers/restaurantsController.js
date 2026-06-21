import Restaurant from '../models/Restaurant.js';
import RestaurantMenu from '../models/RestaurantMenu.js';
import RestaurantOrder from '../models/RestaurantOrder.js';

// GET all restaurants with pagination and filters
export const getAllRestaurants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { city, cuisine, search, isOpen } = req.query;

    const skip = (page - 1) * limit;
    const filter = { isActive: true };

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }
    if (cuisine) {
      filter.cuisine = { $regex: cuisine, $options: 'i' };
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { cuisine: { $regex: search, $options: 'i' } }
      ];
    }
    if (isOpen !== undefined) {
      filter.isOpen = isOpen === 'true';
    }

    const restaurants = await Restaurant.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: restaurants,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET single restaurant with menu items
export const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    // Get menu items
    const menus = await RestaurantMenu.find({ restaurantId: id }).sort({ category: 1 });

    res.status(200).json({
      status: 'success',
      data: {
        ...restaurant.toObject(),
        menus
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// POST create new restaurant
export const createRestaurant = async (req, res) => {
  try {
    const { name, description, cuisine, address, city, state, country, phone, email, owner } = req.body;

    if (!name || !cuisine) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and cuisine are required'
      });
    }

    const restaurant = new Restaurant({
      name,
      description,
      cuisine,
      address,
      city,
      state,
      country,
      phone,
      email,
      owner: owner || req.body.ownerId
    });

    await restaurant.save();

    res.status(201).json({
      status: 'success',
      message: 'Restaurant created successfully',
      data: restaurant
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// PUT update restaurant
export const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(id, updates, { new: true });

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Restaurant updated successfully',
      data: restaurant
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// DELETE restaurant
export const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findByIdAndDelete(id);

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    // Also delete associated menu items and orders
    await RestaurantMenu.deleteMany({ restaurantId: id });
    await RestaurantOrder.deleteMany({ restaurantId: id });

    res.status(200).json({
      status: 'success',
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET restaurant menu items
export const getRestaurantMenus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { category, page = 1, limit = 50 } = req.query;

    const filter = { restaurantId };
    if (category && category !== 'all') {
      filter.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const menus = await RestaurantMenu.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ category: 1 });

    const total = await RestaurantMenu.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: menus,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// POST add menu item
export const addMenuItem = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, price, image, category, prepTime, rating } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, price, and category are required'
      });
    }

    const menuItem = new RestaurantMenu({
      restaurantId,
      name,
      description,
      price,
      image,
      category,
      prepTime,
      rating
    });

    await menuItem.save();

    res.status(201).json({
      status: 'success',
      message: 'Menu item added successfully',
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// PUT update menu item
export const updateMenuItem = async (req, res) => {
  try {
    const { restaurantId, menuItemId } = req.params;
    const updates = req.body;

    const menuItem = await RestaurantMenu.findByIdAndUpdate(menuItemId, updates, { new: true });

    if (!menuItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Menu item updated successfully',
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// DELETE menu item
export const deleteMenuItem = async (req, res) => {
  try {
    const { restaurantId, menuItemId } = req.params;

    const menuItem = await RestaurantMenu.findByIdAndDelete(menuItemId);

    if (!menuItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// POST create order
export const createOrder = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { items, subtotal, deliveryFee, tax, total, paymentMethod, customerName, customerPhone, customerAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Order must contain at least one item'
      });
    }

    const order = new RestaurantOrder({
      restaurantId,
      items,
      subtotal,
      deliveryFee,
      tax,
      total,
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress
    });

    await order.save();

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET restaurant orders
export const getRestaurantOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { restaurantId };
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await RestaurantOrder.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await RestaurantOrder.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET single order
export const getOrderById = async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;

    const order = await RestaurantOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// PUT update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updates = { status };

    if (status === 'preparing') {
      updates.prepStartTime = new Date();
    }
    if (status === 'on_the_way') {
      updates.deliveryStartTime = new Date();
    }
    if (status === 'delivered') {
      updates.completedAt = new Date();
    }

    const order = await RestaurantOrder.findByIdAndUpdate(orderId, updates, { new: true });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
