import express from 'express';
import Delivery from '../models/Delivery.js';
import DeliveryOrder from '../models/DeliveryOrder.js';
import Courier from '../models/Courier.js';

const router = express.Router();

// ============================================
// DELIVERY SERVICE ROUTES
// ============================================

// Get delivery service info
router.get('/service/:deliveryId', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.deliveryId)
      .populate('owner', 'name email phone');
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery service not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get delivery service stats
router.get('/service/:deliveryId/stats', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.deliveryId);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery service not found'
      });
    }
    
    const totalOrders = await DeliveryOrder.countDocuments({
      deliveryService: req.params.deliveryId
    });
    
    const completedOrders = await DeliveryOrder.countDocuments({
      deliveryService: req.params.deliveryId,
      status: 'delivered'
    });
    
    const activeOrders = await DeliveryOrder.countDocuments({
      deliveryService: req.params.deliveryId,
      status: { $in: ['pending', 'accepted', 'in-transit'] }
    });
    
    const activeCouriers = await Courier.countDocuments({
      delivery: req.params.deliveryId,
      isOnline: true
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        activeOrders,
        activeCouriers,
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0,
        avgRating: delivery.avgRating
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// DELIVERY ORDERS ROUTES
// ============================================

// Get all delivery orders
router.get('/:deliveryId/orders', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;
    
    const filter = { deliveryService: req.params.deliveryId };
    if (status) {
      filter.status = status;
    }
    
    const orders = await DeliveryOrder.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await DeliveryOrder.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single delivery order
router.get('/:deliveryId/orders/:orderId', async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.orderId)
      .populate('courier', 'name phone avgRating');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create delivery order
router.post('/:deliveryId/orders', async (req, res) => {
  try {
    const {
      customer,
      pickup,
      delivery,
      items,
      baseAmount,
      distanceKm,
      deliveryFee,
      deliveryType,
      requiresSignature,
      isFragile,
      isPerishable
    } = req.body;
    
    const orderId = `ORD-${Date.now()}`;
    
    const distanceFee = distanceKm * (0.50); // $0.50 per km
    const tax = ((baseAmount + distanceFee + deliveryFee) * 0.1); // 10% tax
    const totalAmount = baseAmount + distanceFee + deliveryFee + tax;
    
    const order = new DeliveryOrder({
      orderId,
      deliveryService: req.params.deliveryId,
      customer,
      pickup,
      delivery,
      items,
      baseAmount,
      distanceKm,
      distanceFee,
      deliveryFee,
      tax,
      totalAmount,
      deliveryType,
      requiresSignature,
      isFragile,
      isPerishable
    });
    
    await order.save();
    console.log('✅ Delivery order created:', orderId);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update order status
router.patch('/:deliveryId/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const statusMap = {
      'pending': null,
      'accepted': 'acceptedAt',
      'picked-up': 'pickedUpAt',
      'in-transit': 'inTransitAt',
      'arriving': null,
      'delivered': 'deliveredAt',
      'failed': 'failedAt',
      'cancelled': null
    };
    
    const updateData = { status };
    if (statusMap[status]) {
      updateData[statusMap[status]] = new Date();
    }
    
    const order = await DeliveryOrder.findByIdAndUpdate(
      req.params.orderId,
      updateData,
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log('✅ Order status updated:', order.orderId, status);
    
    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Assign courier to order
router.patch('/:deliveryId/orders/:orderId/assign', async (req, res) => {
  try {
    const { courierId } = req.body;
    
    const courier = await Courier.findById(courierId);
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }
    
    const order = await DeliveryOrder.findByIdAndUpdate(
      req.params.orderId,
      {
        courier: courierId,
        courierName: courier.name,
        courierPhone: courier.phone,
        courierRating: courier.avgRating,
        status: 'accepted',
        acceptedAt: new Date()
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log('✅ Courier assigned to order:', courier.name);
    
    res.status(200).json({
      success: true,
      message: 'Courier assigned successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update real-time location
router.patch('/:deliveryId/orders/:orderId/location', async (req, res) => {
  try {
    const { latitude, longitude, status } = req.body;
    
    const updateData = {
      'lastLocation.coordinates': [longitude, latitude],
      'lastLocation.timestamp': new Date(),
      $push: {
        locationHistory: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          timestamp: new Date(),
          status: status || 'in-transit'
        }
      }
    };
    
    const order = await DeliveryOrder.findByIdAndUpdate(
      req.params.orderId,
      updateData,
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Location updated',
      data: {
        orderId: order.orderId,
        lastLocation: order.lastLocation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// COURIER ROUTES
// ============================================

// Get all couriers
router.get('/:deliveryId/couriers', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    
    const couriers = await Courier.find({ delivery: req.params.deliveryId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Courier.countDocuments({ delivery: req.params.deliveryId });
    
    res.status(200).json({
      success: true,
      data: couriers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add courier
router.post('/:deliveryId/couriers', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      vehicleType,
      vehiclePlate,
      licenseNumber
    } = req.body;
    
    const courier = new Courier({
      delivery: req.params.deliveryId,
      name,
      email,
      phone,
      vehicleType,
      vehiclePlate,
      licenseNumber
    });
    
    await courier.save();
    console.log('✅ Courier added:', name);
    
    res.status(201).json({
      success: true,
      message: 'Courier added successfully',
      data: courier
    });
  } catch (error) {
    console.error('❌ Error adding courier:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update courier status
router.patch('/:deliveryId/couriers/:courierId/status', async (req, res) => {
  try {
    const { status, isOnline, isAvailable } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (isOnline !== undefined) updateData.isOnline = isOnline;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    
    const courier = await Courier.findByIdAndUpdate(
      req.params.courierId,
      updateData,
      { new: true }
    );
    
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }
    
    console.log('✅ Courier status updated');
    
    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: courier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update courier location
router.patch('/:deliveryId/couriers/:courierId/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    const courier = await Courier.findByIdAndUpdate(
      req.params.courierId,
      {
        'currentLocation.coordinates': [longitude, latitude],
        'currentLocation.lastUpdated': new Date()
      },
      { new: true }
    );
    
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Courier not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Location updated',
      data: {
        courierId: courier._id,
        currentLocation: courier.currentLocation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get available couriers
router.get('/:deliveryId/couriers/available', async (req, res) => {
  try {
    const couriers = await Courier.find({
      delivery: req.params.deliveryId,
      isOnline: true,
      isAvailable: true,
      status: 'active'
    });
    
    res.status(200).json({
      success: true,
      data: couriers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
