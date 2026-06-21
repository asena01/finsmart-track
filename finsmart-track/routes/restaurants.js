import express from 'express';
import mongoose from 'mongoose';
import Menu from '../models/Menu.js';
import RestaurantSettings from '../models/RestaurantSettings.js';
import RestaurantOrder from '../models/RestaurantOrder.js';
import User from '../models/User.js';
import { emitOrderUpdate } from '../services/chatSocketService.js';

const router = express.Router();

// ============ RESTAURANTS LIST ============

// Get all restaurants (for food ordering page)
router.get('/', async (req, res) => {
  try {
    console.log(`📍 Fetching all restaurants for food ordering`);

    // Fetch all restaurant vendors from User collection
    const restaurants = await User.find({
      userType: 'vendor',
      vendorType: 'restaurant'
    }).limit(100).lean();

    if (!restaurants || restaurants.length === 0) {
      console.log('ℹ️ No restaurants found. Searching for all vendors...');
      // Debug: check what vendors exist
      const allVendors = await User.find({ userType: 'vendor' }).select('email vendorType businessName').lean();
      console.log('📊 All vendors in DB:', allVendors.map(v => ({ email: v.email, type: v.vendorType, name: v.businessName })));

      return res.status(200).json({
        status: 'success',
        data: []
      });
    }

    console.log(`✅ Found ${restaurants.length} restaurants`);

    // Helper function to generate placeholder SVG image
    const generatePlaceholderImage = (name) => {
      const colors = ['FF6B35', 'F4A261', '2A9D8F', 'E76F51', 'D62828'];
      const colorIndex = name.charCodeAt(0) % colors.length;
      const color = colors[colorIndex];
      return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23${color}" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="32" font-family="Arial" font-weight="bold"%3E${encodeURIComponent(name.substring(0, 20))}%3C/text%3E%3C/svg%3E`;
    };

    res.status(200).json({
      status: 'success',
      data: restaurants.map(r => ({
        _id: r._id,
        id: r._id.toString(),
        restaurantId: r._id.toString(),
        name: r.businessName || r.name || 'Restaurant',
        description: r.businessDescription || '',
        cuisine: r.cuisineType?.join(', ') || 'Cuisine',
        address: r.address?.street || r.address || '',
        city: r.address?.city || r.city || '',
        phone: r.phone || '',
        email: r.email || '',
        rating: 4.5,
        reviews: 0,
        deliveryTime: 30,
        deliveryFee: 2.99,
        minOrder: 10,
        icon: '🍽️',
        // Use businessImage if available, otherwise generate a placeholder
        image: r.businessImage || generatePlaceholderImage(r.businessName || r.name || 'Restaurant'),
        isOpen: true,
        menus: []
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching restaurants:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============ RESTAURANT SETTINGS ============

// Get restaurant settings
router.get('/:restaurantId/settings', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const settings = await RestaurantSettings.findOne({ restaurantId });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant settings not found'
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching restaurant settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create/Update restaurant settings
router.post('/:restaurantId/settings', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const vendorId = req.headers['x-vendor-id'];

    if (!vendorId || vendorId !== restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Invalid restaurant ID'
      });
    }

    let settings = await RestaurantSettings.findOne({ restaurantId });

    if (!settings) {
      settings = new RestaurantSettings({
        restaurantId,
        restaurant: vendorId,
        ...req.body
      });
    } else {
      Object.assign(settings, req.body);
    }

    await settings.save();

    console.log(`✅ Restaurant settings updated for: ${restaurantId}`);

    res.status(200).json({
      success: true,
      message: 'Restaurant settings saved successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error saving restaurant settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============ MENU MANAGEMENT ============

// Get restaurant menu items (supports FoodService API)
router.get('/:restaurantId/menus', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 50, category } = req.query;

    const menu = await Menu.findOne({ restaurantId });

    if (!menu) {
      return res.status(200).json({
        status: 'success',
        data: [],
        message: 'No menu found'
      });
    }

    let items = menu.items || [];

    if (category) {
      items = items.filter(item => item.category === category);
    }

    // Handle pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedItems = items.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: paginatedItems,
      pagination: {
        total: items.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(items.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Add menu item (supports FoodService API)
router.post('/:restaurantId/menus', async (req, res) => {
  console.log(`🔵 POST /restaurants/:restaurantId/menus handler ENTERED`);

  try {
    const { restaurantId } = req.params;
    const vendorId = req.headers['x-vendor-id'];

    console.log(`📝 Adding menu item to restaurant:`, {
      restaurantId: restaurantId,
      vendorId: vendorId,
      allHeaders: req.headers,
      bodyName: req.body?.name,
      bodyPrice: req.body?.price,
      bodyCategory: req.body?.category,
      bodyPrepTime: req.body?.prepTime
    });

    // Debug: Check the comparison
    const isAuthorized = vendorId && vendorId === restaurantId;
    console.log(`🔐 Authorization check: "${vendorId}" === "${restaurantId}" = ${isAuthorized}`);

    if (!vendorId || vendorId !== restaurantId) {
      console.error('❌ Unauthorized attempt:', {
        restaurantId,
        vendorId,
        headerValue: req.headers['x-vendor-id'],
        match: vendorId === restaurantId
      });
      return res.status(403).json({
        status: 'error',
        message: `Unauthorized: vendor ID mismatch. Expected: ${restaurantId}, Got: ${vendorId}`
      });
    }

    let menu = await Menu.findOne({ restaurantId });

    if (!menu) {
      // Convert vendorId to ObjectId if it's a valid MongoDB ID
      let restaurantObjId;
      try {
        if (mongoose.Types.ObjectId.isValid(vendorId)) {
          restaurantObjId = new mongoose.Types.ObjectId(vendorId);
        } else {
          restaurantObjId = new mongoose.Types.ObjectId();
        }
      } catch (e) {
        restaurantObjId = new mongoose.Types.ObjectId();
      }

      menu = new Menu({
        restaurantId,
        restaurant: restaurantObjId,
        items: [],
        isActive: true
      });
    }

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      name: req.body.name,
      description: req.body.description || '',
      price: Number(req.body.price) || 0,
      discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : null, // Optional: display/marked price
      originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : null,
      category: req.body.category || 'main-course',
      vendorId: restaurantId, // Always set to the restaurant creating the item
      image: req.body.image,
      imageUrl: req.body.imageUrl,
      imageStoragePath: req.body.imageStoragePath,
      isAvailable: req.body.isAvailable !== false,
      preparationTime: Number(req.body.prepTime) || Number(req.body.preparationTime) || 15,
      prepTime: Number(req.body.prepTime) || Number(req.body.preparationTime) || 15,
      spiceLevel: req.body.spiceLevel || 'mild',
      allergens: Array.isArray(req.body.allergens) ? req.body.allergens : [],
      vegetarian: Boolean(req.body.vegetarian) || false,
      vegan: Boolean(req.body.vegan) || false,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      ratings: req.body.ratings || { average: 0, count: 0 },
      isSpecial: Boolean(req.body.isSpecial) || false,
      createdAt: new Date()
    };

    console.log(`📦 Menu item payload:`, {
      name: newItem.name,
      price: newItem.price,
      discountPrice: newItem.discountPrice,
      originalPrice: newItem.originalPrice,
      vendorId: newItem.vendorId,
      category: newItem.category
    });

    menu.items.push(newItem);
    menu.lastUpdated = new Date();

    console.log(`💾 Saving menu with item:`, {
      restaurantId: menu.restaurantId,
      itemName: newItem.name,
      itemPrice: newItem.price,
      itemCategory: newItem.category,
      totalItems: menu.items.length
    });

    await menu.save();

    console.log(`✅ Menu item added: ${newItem.name} to restaurant ${restaurantId}`);

    res.status(201).json({
      status: 'success',
      message: 'Menu item added successfully',
      data: newItem
    });
  } catch (error) {
    console.error('❌ Error adding menu item:', error.message);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      validationErrors: error.errors ? Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`) : null,
      stack: error.stack
    });

    // Provide detailed error response
    let errorMessage = error.message;
    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(e => e.message);
      errorMessage = 'Validation error: ' + validationMessages.join(', ');
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage
    });
  }
});

// Update menu item (supports FoodService API)
router.put('/:restaurantId/menus/:itemId', async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const vendorId = req.headers['x-vendor-id'];

    if (!vendorId || vendorId !== restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    const menu = await Menu.findOne({ restaurantId });

    if (!menu) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu not found'
      });
    }

    const itemIndex = menu.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    menu.items[itemIndex] = {
      ...menu.items[itemIndex].toObject?.() || menu.items[itemIndex],
      ...req.body,
      _id: menu.items[itemIndex]._id,
      createdAt: menu.items[itemIndex].createdAt
    };
    menu.lastUpdated = new Date();
    await menu.save();

    console.log(`✅ Menu item updated: ${itemId}`);

    res.status(200).json({
      status: 'success',
      message: 'Menu item updated successfully',
      data: menu.items[itemIndex]
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete menu item (supports FoodService API)
router.delete('/:restaurantId/menus/:itemId', async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const vendorId = req.headers['x-vendor-id'];

    if (!vendorId || vendorId !== restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    const menu = await Menu.findOne({ restaurantId });

    if (!menu) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu not found'
      });
    }

    menu.items = menu.items.filter(item => item._id.toString() !== itemId);
    menu.lastUpdated = new Date();
    await menu.save();

    console.log(`✅ Menu item deleted: ${itemId}`);

    res.status(200).json({
      status: 'success',
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============ RESTAURANT ORDERS ============

// Create new order (customer placing order from food page)
router.post('/:restaurantId/orders', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const {
      customerId,
      items,
      subtotal,
      deliveryFee,
      tax,
      total,
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress,
      deliveryService,
      deliveryDistance
    } = req.body;

    console.log(`📝 Creating order for restaurant: ${restaurantId}`, {
      customerName,
      itemCount: items?.length,
      total
    });

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Order must contain at least one item'
      });
    }

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing customer information'
      });
    }

    // Create order object
    const orderItems = items.map(item => {
      const itemObj = {
        name: item.name,
        price: item.price,
        quantity: item.quantity
      };

      // Only add menuItemId if it's a valid ObjectId
      if (item.menuItemId) {
        try {
          if (mongoose.Types.ObjectId.isValid(item.menuItemId)) {
            itemObj.menuItemId = item.menuItemId;
          }
        } catch (e) {
          console.warn('⚠️ Invalid menuItemId:', item.menuItemId);
        }
      }

      if (item.specialInstructions) {
        itemObj.specialInstructions = item.specialInstructions;
      }

      return itemObj;
    });

    const newOrder = new RestaurantOrder({
      restaurantId,
      customerId: customerId || null, // Link order to customer
      items: orderItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress,
      status: 'pending'
    });

    console.log(`📋 Order linked to customerId: ${customerId}`);

    await newOrder.save();

    console.log(`✅ Order created successfully: ${newOrder._id}`);

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: {
        _id: newOrder._id,
        orderId: newOrder._id.toString(),
        status: newOrder.status,
        createdAt: newOrder.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error creating order:', error.message);
    if (error.errors) {
      console.error('❌ Validation errors:', Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`));
    }
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create order',
      details: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : undefined
    });
  }
});

// Get orders by customer ID (for customer dashboard)
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await RestaurantOrder.find({ customerId })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await RestaurantOrder.countDocuments({ customerId });

    console.log(`✅ Fetched ${orders.length} food orders for customer ${customerId}`);

    res.status(200).json({
      status: 'success',
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Error fetching customer food orders:', error);
    res.status(500).json({
      status: 'error',
      success: false,
      message: error.message
    });
  }
});

// Get restaurant orders (vendor dashboard)
router.get('/:restaurantId/orders', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    console.log(`📥 Fetching orders for restaurant: ${restaurantId}`, { page, limit, status });

    // Try both string and ObjectId formats for restaurantId
    let filter;
    try {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        filter = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };
      } else {
        filter = { restaurantId };
      }
    } catch (e) {
      filter = { restaurantId };
    }

    if (status) {
      filter.status = status;
    }

    console.log('🔍 Filter:', filter);

    const orders = await RestaurantOrder.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await RestaurantOrder.countDocuments(filter);

    console.log(`✅ Fetched ${orders.length} orders for restaurant ${restaurantId}`, { total, filter });

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Error fetching restaurant orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============ ORDER STATUS UPDATES ============

// Update order status (vendor dashboard - restaurant updates order status)
router.put('/:restaurantId/orders/:orderId/status', async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;
    const { status } = req.body;
    const vendorId = req.headers['x-vendor-id'] || req.query.vendorId;
    const userId = req.query.userId;

    // Find order first to check authorization
    const order = await RestaurantOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate authorization (either vendor or the customer who placed the order)
    const isVendor = vendorId && vendorId === restaurantId;
    const isCustomer = userId && order.customerId && order.customerId.toString() === userId;

    if (!isVendor && !isCustomer) {
      console.warn('⚠️ Unauthorized attempt to update order status');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only update your own orders'
      });
    }

    // Customer can only mark as delivered
    if (isCustomer && !isVendor && status !== 'delivered') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Customers can only mark orders as delivered'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'on_the_way', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Verify this order belongs to this restaurant
    if (order.restaurantId.toString() !== restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'This order does not belong to your restaurant'
      });
    }

    // Update status
    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();
    const now = new Date();

    // Set transition timestamps
    if (status === 'preparing' && !order.prepStartTime) {
      order.prepStartTime = now;
    } else if (status === 'ready' && !order.readyAt) {
      order.readyAt = now;
    } else if (status === 'dispatched' && !order.dispatchedAt) {
      order.dispatchedAt = now;
      order.deliveryStartTime = now;
    } else if (status === 'on_the_way' && !order.deliveryStartTime) {
      order.deliveryStartTime = now;
    } else if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = now;
      order.completedAt = now;
    }

    await order.save();

    // Emit real-time update
    emitOrderUpdate(order);

    console.log(`✅ Order ${orderId} status updated: ${previousStatus} → ${status}`);

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
});

// Get restaurant dashboard stats
router.get('/:restaurantId/stats', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const settings = await RestaurantSettings.findOne({ restaurantId });

    const todayOrders = await RestaurantOrder.countDocuments({
      restaurantId,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    const completedOrders = await RestaurantOrder.countDocuments({
      restaurantId,
      status: 'delivered'
    });

    const pendingOrders = await RestaurantOrder.countDocuments({
      restaurantId,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    const totalRevenue = settings?.monthlyRevenue || 0;

    res.status(200).json({
      success: true,
      data: {
        todayOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        averageRating: settings?.averageRating || 0,
        totalReviews: settings?.totalReviews || 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
