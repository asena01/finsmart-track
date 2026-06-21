import mongoose from 'mongoose';
import IntegratedDelivery from '../models/IntegratedDelivery.js';
import BusinessDeliveryIntegration from '../models/BusinessDeliveryIntegration.js';
import DeliveryProviderService from '../models/DeliveryProviderService.js';
import RestaurantOrder from '../models/RestaurantOrder.js';

/**
 * Create a delivery request with integrated provider
 */
export const createDelivery = async (req, res) => {
  try {
    const { businessId, businessType, integrationId, orderId, pickupLocation, deliveryLocation, items, totalAmount } = req.body;

    // Validate required fields
    if (!businessId || !businessType || !integrationId || !orderId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Get integration details
    const integration = await BusinessDeliveryIntegration.findById(integrationId)
      .populate('providerId', 'name')
      .populate('providerServiceId', 'basePrice perKmRate');

    if (!integration) {
      return res.status(404).json({
        status: 'error',
        message: 'Integration not found'
      });
    }

    // Calculate delivery price (simplified - should be called to provider API)
    const deliveryPricing = {
      basePrice: integration.providerServiceId?.basePrice || 5,
      distanceCharge: 0, // Calculate based on coordinates
      weightCharge: 0,
      tax: 0,
      total: integration.providerServiceId?.basePrice || 5
    };

    const newDelivery = new IntegratedDelivery({
      orderId,
      businessId,
      businessType,
      integrationId,
      providerId: integration.providerId._id,
      providerServiceId: integration.providerServiceId._id,
      pickupLocation,
      deliveryLocation,
      items,
      totalAmount,
      deliveryPrice: deliveryPricing,
      status: 'pending'
    });

    await newDelivery.save();

    // Update order with delivery reference
    await RestaurantOrder.findByIdAndUpdate(orderId, {
      integratedDeliveryId: newDelivery._id,
      deliveryStatus: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Delivery created successfully',
      data: newDelivery
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get deliveries for a business
 */
export const getBusinessDeliveries = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { businessId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const deliveries = await IntegratedDelivery.find(filter)
      .populate('providerId', 'name')
      .populate('providerServiceId', 'name category basePrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await IntegratedDelivery.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: deliveries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting business deliveries:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get delivery details
 */
export const getDeliveryDetails = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await IntegratedDelivery.findById(deliveryId)
      .populate('providerId', 'name email phone')
      .populate('providerServiceId', 'name category');

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
    console.error('Error getting delivery details:', error);
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
    const { deliveryId } = req.params;
    const { status, currentLocation, notes } = req.body;

    const delivery = await IntegratedDelivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }

    // Update status
    delivery.status = status;

    // Update tracking info
    if (currentLocation) {
      delivery.tracking.currentLocation = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        timestamp: new Date()
      };

      // Add to history
      delivery.tracking.trackingHistory.push({
        status,
        location: currentLocation,
        timestamp: new Date()
      });
    }

    if (notes) {
      delivery.notes = notes;
    }

    // Set timestamps
    if (status === 'picked_up') {
      delivery.tracking.pickupTime = new Date();
    } else if (status === 'delivered') {
      delivery.tracking.deliveryTime = new Date();
    }

    await delivery.save();

    // Update order status
    await RestaurantOrder.findByIdAndUpdate(delivery.orderId, {
      deliveryStatus: status
    });

    res.status(200).json({
      status: 'success',
      message: 'Delivery status updated',
      data: delivery
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get active deliveries (for tracking)
 */
export const getActiveDeliveries = async (req, res) => {
  try {
    const { businessId } = req.params;

    const activeStatuses = ['picking_up', 'picked_up', 'out_for_delivery'];
    const deliveries = await IntegratedDelivery.find({
      businessId,
      status: { $in: activeStatuses }
    })
      .populate('providerId', 'name')
      .populate('providerServiceId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: deliveries
    });
  } catch (error) {
    console.error('Error getting active deliveries:', error);
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
    const { deliveryId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }

    const delivery = await IntegratedDelivery.findByIdAndUpdate(
      deliveryId,
      {
        customerRating: rating,
        customerFeedback: feedback || ''
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
      message: 'Delivery rated successfully',
      data: delivery
    });
  } catch (error) {
    console.error('Error rating delivery:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Cancel delivery
 */
export const cancelDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { reason } = req.body;

    const delivery = await IntegratedDelivery.findByIdAndUpdate(
      deliveryId,
      {
        status: 'cancelled',
        cancelReason: reason || 'Cancelled by user'
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }

    // Update order
    await RestaurantOrder.findByIdAndUpdate(delivery.orderId, {
      deliveryStatus: 'cancelled'
    });

    res.status(200).json({
      status: 'success',
      message: 'Delivery cancelled',
      data: delivery
    });
  } catch (error) {
    console.error('Error cancelling delivery:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get delivery statistics for business
 */
export const getDeliveryStats = async (req, res) => {
  try {
    const { businessId } = req.params;

    const stats = await IntegratedDelivery.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          completedDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failedDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          activeDeliveries: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['picking_up', 'picked_up', 'out_for_delivery']
                  ]
                },
                1,
                0
              ]
            }
          },
          avgRating: { $avg: '$customerRating' },
          totalRevenue: { $sum: '$deliveryPrice.total' }
        }
      }
    ]);

    const result = stats[0] || {
      totalDeliveries: 0,
      completedDeliveries: 0,
      failedDeliveries: 0,
      activeDeliveries: 0,
      avgRating: 0,
      totalRevenue: 0
    };

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting delivery stats:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
