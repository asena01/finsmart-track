import Delivery from '../models/Delivery.js';
import User from '../models/User.js';

/**
 * Generate unique order number
 */
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DLV-${timestamp}-${random}`;
};

/**
 * Calculate delivery pricing based on distance, weight, size
 */
const calculateDeliveryPrice = (data) => {
  const { distance, weight, sizeCategory, serviceType, deliveryMethod } = data;
  
  let baseRate = 5; // Base delivery fee
  let distanceCharge = (distance || 0) * 0.5; // $0.50 per km
  let weightCharge = (weight || 0) * 0.2; // $0.20 per kg
  let sizeCharge = 0;
  let speedMultiplier = 1;
  
  // Size-based charges
  const sizePricing = {
    'small': 0,
    'medium': 5,
    'large': 15,
    'extra-large': 30
  };
  sizeCharge = sizePricing[sizeCategory] || 0;
  
  // Service type multipliers
  const serviceMultipliers = {
    'standard': 1,
    'express': 1.5,
    'same-day': 2,
    'scheduled': 0.8,
    'bulk': 0.6
  };
  speedMultiplier = serviceMultipliers[serviceType] || 1;
  
  const subtotal = (baseRate + distanceCharge + weightCharge + sizeCharge) * speedMultiplier;
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const totalPrice = subtotal + tax;
  
  return {
    baseRate,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    weightCharge: Math.round(weightCharge * 100) / 100,
    sizeCharge,
    speedMultiplier,
    subtotal: Math.round(subtotal * 100) / 100,
    tax,
    totalPrice
  };
};

/**
 * Get all deliveries with filters
 */
export const getAllDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, provider, customer } = req.query;
    
    const filter = {};
    if (status) filter['tracking.status'] = status;
    if (provider) filter.provider = provider;
    if (customer) filter.customer = customer;
    
    const skip = (page - 1) * limit;
    const deliveries = await Delivery.find(filter)
      .populate('provider', 'name email phone')
      .populate('customer', 'name email phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    
    const total = await Delivery.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      data: deliveries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Get active deliveries (for tracking)
 */
export const getActiveDeliveries = async (req, res) => {
  try {
    const activeStatuses = ['confirmed', 'picked-up', 'in-transit', 'out-for-delivery'];
    
    const deliveries = await Delivery.find({
      'tracking.status': { $in: activeStatuses }
    })
      .populate('provider', 'name phone')
      .populate('agent', 'name phone vehicle')
      .sort({ 'tracking.lastUpdate': -1 })
      .limit(50);
    
    res.status(200).json({
      status: 'success',
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Create new delivery order
 */
export const createDelivery = async (req, res) => {
  try {
    const {
      provider,
      customerName,
      customerPhone,
      customerEmail,
      pickupLocation,
      deliveryLocation,
      package: packageInfo,
      deliveryMethod,
      serviceType,
      distance,
      estimatedTime,
      specialInstructions,
      paymentMethod
    } = req.body;

    if (!provider || !customerName || !customerPhone || !pickupLocation || !deliveryLocation) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Get provider info
    const providerData = await User.findById(provider);
    if (!providerData) {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found'
      });
    }

    // Calculate pricing
    const pricing = calculateDeliveryPrice({
      distance: distance?.value || 0,
      weight: packageInfo?.weight?.value || 0,
      sizeCategory: packageInfo?.totalSize?.category || 'small',
      serviceType: serviceType || 'standard',
      deliveryMethod: deliveryMethod?.type || 'bike'
    });

    // Create delivery order
    const delivery = new Delivery({
      orderNumber: generateOrderNumber(),
      provider,
      providerName: providerData.name,
      providerPhone: providerData.phone,
      providerEmail: providerData.email,
      customerName,
      customerPhone,
      customerEmail,
      pickupLocation,
      deliveryLocation,
      package: packageInfo,
      deliveryMethod,
      serviceType: serviceType || 'standard',
      distance,
      estimatedTime,
      pricing: {
        baseRate: pricing.baseRate,
        distanceRate: { value: 0.5, perUnit: 'km' },
        weightRate: { value: 0.2, perUnit: 'kg' },
        sizeCharge: pricing.sizeCharge,
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        totalPrice: pricing.totalPrice
      },
      specialInstructions,
      paymentMethod: paymentMethod || 'prepaid',
      tracking: {
        status: 'pending',
        currentLocation: pickupLocation
      }
    });

    await delivery.save();

    res.status(201).json({
      status: 'success',
      message: 'Delivery order created successfully',
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get delivery by ID
 */
export const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id)
      .populate('provider', 'name email phone')
      .populate('customer', 'name email phone')
      .populate('agent', 'name phone');

    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update delivery status
 */
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentLocation, notes } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }

    // Update status
    delivery.tracking.status = status;
    delivery.tracking.lastUpdate = new Date();

    // Add to tracking history
    delivery.tracking.trackingHistory.push({
      status,
      location: currentLocation || delivery.tracking.currentLocation,
      timestamp: new Date(),
      notes
    });

    // Update current location if provided
    if (currentLocation) {
      delivery.tracking.currentLocation = currentLocation;
    }

    // Update status-specific timestamps
    if (status === 'picked-up') delivery.pickedUpAt = new Date();
    if (status === 'delivered') delivery.deliveredAt = new Date();
    if (status === 'cancelled') delivery.cancelledAt = new Date();

    await delivery.save();

    res.status(200).json({
      status: 'success',
      message: 'Delivery status updated',
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update delivery with proof of delivery
 */
export const updateProofOfDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { signature, photo, recipientName, notes } = req.body;

    const delivery = await Delivery.findByIdAndUpdate(
      id,
      {
        proofOfDelivery: {
          signature,
          photo,
          recipientName,
          timestamp: new Date(),
          notes
        },
        'tracking.status': 'delivered',
        deliveredAt: new Date()
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Proof of delivery recorded',
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get deliveries by provider
 */
export const getProviderDeliveries = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { provider: providerId };
    if (status) filter['tracking.status'] = status;

    const skip = (page - 1) * limit;
    const deliveries = await Delivery.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Delivery.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: deliveries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
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

/**
 * Get customer deliveries
 */
export const getCustomerDeliveries = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const deliveries = await Delivery.find({ customer: customerId })
      .populate('provider', 'name phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Delivery.countDocuments({ customer: customerId });

    res.status(200).json({
      status: 'success',
      data: deliveries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
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

/**
 * Calculate delivery price
 */
export const calculatePrice = async (req, res) => {
  try {
    const { distance, weight, sizeCategory, serviceType, deliveryMethod } = req.body;

    const pricing = calculateDeliveryPrice({
      distance: distance || 0,
      weight: weight || 0,
      sizeCategory: sizeCategory || 'small',
      serviceType: serviceType || 'standard',
      deliveryMethod: deliveryMethod || 'bike'
    });

    res.status(200).json({
      status: 'success',
      data: pricing
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Rate delivery
 */
export const rateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review, raterType } = req.body; // raterType: 'customer' or 'provider'

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }

    if (raterType === 'customer') {
      delivery.customerRating = {
        rating,
        review,
        ratedAt: new Date()
      };
    } else if (raterType === 'provider') {
      delivery.providerRating = {
        rating,
        review,
        ratedAt: new Date()
      };
    }

    await delivery.save();

    res.status(200).json({
      status: 'success',
      message: 'Rating submitted',
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
