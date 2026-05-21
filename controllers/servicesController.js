import Service from '../models/Service.js';
import User from '../models/User.js';

/**
 * Get all services with pagination and filters
 */
export const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, city, search, minPrice, maxPrice } = req.query;
    
    const filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }
    
    const skip = (page - 1) * limit;
    const services = await Service.find(filter)
      .populate('serviceProvider', 'name email phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1 });
    
    const total = await Service.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      data: services,
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
 * Get featured services (top-rated)
 */
export const getFeaturedServices = async (req, res) => {
  try {
    const limit = req.query.limit || 6;
    
    const services = await Service.find({ isActive: true, isVerified: true })
      .populate('serviceProvider', 'name email phone')
      .sort({ rating: -1, reviews: -1 })
      .limit(Number(limit));
    
    res.status(200).json({
      status: 'success',
      data: services
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Get services by category
 */
export const getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const services = await Service.find({ category, isActive: true })
      .populate('serviceProvider', 'name email phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1 });
    
    const total = await Service.countDocuments({ category, isActive: true });
    
    res.status(200).json({
      status: 'success',
      data: services,
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
 * Get services by city
 */
export const getServicesByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const services = await Service.find({ 'location.city': new RegExp(city, 'i'), isActive: true })
      .populate('serviceProvider', 'name email phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1 });
    
    const total = await Service.countDocuments({ 'location.city': new RegExp(city, 'i'), isActive: true });
    
    res.status(200).json({
      status: 'success',
      data: services,
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
 * Get single service by ID
 */
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id).populate('serviceProvider', 'name email phone businessName');
    
    if (!service) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }
    
    res.status(200).json({
      status: 'success',
      data: service
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Create new service (for service providers)
 */
export const createService = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      icon,
      basePrice,
      duration,
      serviceArea,
      location,
      features,
      certifications
    } = req.body;
    
    const userId = req.headers['user-id'] || req.body.serviceProvider;
    
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'Service provider ID required' });
    }
    
    const provider = await User.findById(userId);
    if (!provider) {
      return res.status(400).json({ status: 'error', message: 'Service provider not found' });
    }
    
    const service = new Service({
      name,
      description,
      category,
      icon,
      basePrice,
      duration,
      serviceArea,
      location,
      features,
      certifications,
      serviceProvider: userId,
      providerName: provider.name,
      providerPhone: provider.phone,
      providerEmail: provider.email,
      isVerified: true
    });
    
    await service.save();
    
    res.status(201).json({
      status: 'success',
      message: 'Service created successfully',
      data: service
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Update service
 */
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow updating these fields
    delete updateData.serviceProvider;
    delete updateData.providerName;
    
    const service = await Service.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!service) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Service updated successfully',
      data: service
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Delete service
 */
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findByIdAndDelete(id);
    
    if (!service) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Update service rating
 */
export const updateServiceRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, reviews } = req.body;
    
    const service = await Service.findByIdAndUpdate(
      id,
      { rating, reviews },
      { new: true }
    );
    
    if (!service) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }
    
    res.status(200).json({
      status: 'success',
      data: service
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Update service availability
 */
export const updateServiceAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;
    
    const service = await Service.findByIdAndUpdate(
      id,
      { availability },
      { new: true }
    );
    
    if (!service) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }
    
    res.status(200).json({
      status: 'success',
      data: service
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Search services
 */
export const searchServices = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice } = req.query;
    
    const filter = { isActive: true };
    
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { category: new RegExp(q, 'i') }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }
    
    const services = await Service.find(filter)
      .populate('serviceProvider', 'name email phone')
      .sort({ rating: -1 });
    
    res.status(200).json({
      status: 'success',
      data: services
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Get provider services
 */
export const getProviderServices = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const services = await Service.find({ serviceProvider: providerId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    
    const total = await Service.countDocuments({ serviceProvider: providerId });
    
    res.status(200).json({
      status: 'success',
      data: services,
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
