import DeliveryProviderService from '../models/DeliveryProviderService.js';
import DeliveryPartner from '../models/DeliveryPartner.js';

/**
 * Get all services offered by a delivery provider
 */
export const getProviderServices = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { category, isActive, page = 1, limit = 20 } = req.query;

    // Verify provider exists
    const provider = await DeliveryPartner.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery provider not found'
      });
    }

    // Build filter
    const filter = { providerId };
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Get services
    const skip = (Number(page) - 1) * Number(limit);
    const services = await DeliveryProviderService.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await DeliveryProviderService.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: services,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting provider services:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get a specific service by ID
 */
export const getServiceById = async (req, res) => {
  try {
    const { providerId, serviceId } = req.params;

    const service = await DeliveryProviderService.findOne({
      _id: serviceId,
      providerId
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: service
    });
  } catch (error) {
    console.error('Error getting service:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Create a new service for a delivery provider
 */
export const createService = async (req, res) => {
  try {
    const { providerId } = req.params;
    const {
      name,
      description,
      category,
      basePrice,
      perKmRate,
      perKgRate,
      estimatedDeliveryTime,
      maxDistance,
      maxWeight,
      features,
      coverage,
      isActive
    } = req.body;

    // Validate required fields
    if (!name || !category || basePrice === undefined || !perKmRate === undefined || !estimatedDeliveryTime) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, category, basePrice, perKmRate, estimatedDeliveryTime'
      });
    }

    // Verify provider exists
    const provider = await DeliveryPartner.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery provider not found'
      });
    }

    // Create service
    const newService = new DeliveryProviderService({
      providerId,
      name,
      description,
      category,
      basePrice,
      perKmRate,
      perKgRate: perKgRate || null,
      estimatedDeliveryTime,
      maxDistance: maxDistance || null,
      maxWeight: maxWeight || null,
      features: features || {
        realTimeTracking: false,
        insurance: false,
        temperature_control: false,
        signature_required: false,
        scheduled_delivery: false
      },
      coverage: coverage || [],
      isActive: isActive !== false // Default to true
    });

    await newService.save();

    res.status(201).json({
      status: 'success',
      message: 'Service created successfully',
      data: newService
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update a service
 */
export const updateService = async (req, res) => {
  try {
    const { providerId, serviceId } = req.params;
    const updates = req.body;

    // Prevent changing providerId
    delete updates.providerId;

    // Find and update service
    const service = await DeliveryProviderService.findOneAndUpdate(
      { _id: serviceId, providerId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Service updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Delete a service
 */
export const deleteService = async (req, res) => {
  try {
    const { providerId, serviceId } = req.params;

    const service = await DeliveryProviderService.findOneAndDelete({
      _id: serviceId,
      providerId
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully',
      data: { _id: serviceId }
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get available services for a specific category
 */
export const getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const services = await DeliveryProviderService.find({
      category,
      isActive: true
    })
      .populate('providerId', 'name email phone website')
      .sort({ 'stats.averageRating': -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await DeliveryProviderService.countDocuments({
      category,
      isActive: true
    });

    res.status(200).json({
      status: 'success',
      data: services,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting services by category:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Search services
 */
export const searchServices = async (req, res) => {
  try {
    const { query, category, minRating = 0, page = 1, limit = 20 } = req.query;

    const filter = {
      isActive: true,
      'stats.averageRating': { $gte: Number(minRating) }
    };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const services = await DeliveryProviderService.find(filter)
      .populate('providerId', 'name email phone website')
      .sort({ 'stats.averageRating': -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await DeliveryProviderService.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: services,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error searching services:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update service statistics
 */
export const updateServiceStats = async (req, res) => {
  try {
    const { providerId, serviceId } = req.params;
    const { totalOrders, successfulOrders, averageRating } = req.body;

    const service = await DeliveryProviderService.findOne({
      _id: serviceId,
      providerId
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    if (totalOrders !== undefined) service.stats.totalOrders = totalOrders;
    if (successfulOrders !== undefined) service.stats.successfulOrders = successfulOrders;
    if (averageRating !== undefined) service.stats.averageRating = Math.min(5, Math.max(0, averageRating));

    // Calculate success rate
    if (service.stats.totalOrders > 0) {
      service.stats.successRate = Math.round((service.stats.successfulOrders / service.stats.totalOrders) * 100);
    }

    await service.save();

    res.status(200).json({
      status: 'success',
      message: 'Service stats updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Error updating service stats:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
