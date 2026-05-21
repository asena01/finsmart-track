import Hair from '../models/Hair.js';

// Get all hair products/services
export const getAllHair = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, serviceType, page = 1, limit = 10, isFeatured } = req.query;

    let filter = { isActive: true };

    if (category) filter.category = category;
    if (serviceType) filter.serviceType = serviceType;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };
    if (isFeatured) filter.isFeatured = isFeatured === 'true';

    const skip = (page - 1) * limit;
    const hair = await Hair.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ isFeatured: -1, createdAt: -1 });

    const total = await Hair.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: hair,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get featured
export const getFeatured = async (req, res) => {
  try {
    const limit = req.query.limit || 6;
    const hair = await Hair.find({ isFeatured: true, isActive: true })
      .limit(Number(limit))
      .sort({ rating: -1, createdAt: -1 });

    res.status(200).json({ status: 'success', data: hair });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get by category
export const getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const hair = await Hair.find({ category, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Hair.countDocuments({ category, isActive: true });

    res.status(200).json({
      status: 'success',
      data: hair,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get by type (product/service)
export const getByType = async (req, res) => {
  try {
    const { type } = req.params; // 'product' or 'service'
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const hair = await Hair.find({ serviceType: type, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Hair.countDocuments({ serviceType: type, isActive: true });

    res.status(200).json({
      status: 'success',
      data: hair,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get single
export const getHairById = async (req, res) => {
  try {
    const hair = await Hair.findById(req.params.id).populate('rating.reviews.userId', 'name email');

    if (!hair) {
      return res.status(404).json({ status: 'error', message: 'Hair product/service not found' });
    }

    res.status(200).json({ status: 'success', data: hair });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create
export const createHair = async (req, res) => {
  try {
    const { name, category, price, serviceType, description } = req.body;

    if (!name || !category || !price || !serviceType) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const vendorId = req.user?._id || req.body.vendorId;
    const vendorName = req.user?.businessName || req.body.vendorName;

    const hair = new Hair({
      ...req.body,
      vendorId,
      vendorName
    });

    await hair.save();

    res.status(201).json({
      status: 'success',
      message: 'Hair product/service created successfully',
      data: hair
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update
export const updateHair = async (req, res) => {
  try {
    const hair = await Hair.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!hair) {
      return res.status(404).json({ status: 'error', message: 'Hair product/service not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Hair updated successfully',
      data: hair
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete
export const deleteHair = async (req, res) => {
  try {
    const hair = await Hair.findByIdAndDelete(req.params.id);

    if (!hair) {
      return res.status(404).json({ status: 'error', message: 'Hair product/service not found' });
    }

    res.status(200).json({ status: 'success', message: 'Hair deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Add review
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, userId, userName } = req.body;

    const hair = await Hair.findById(id);
    if (!hair) {
      return res.status(404).json({ status: 'error', message: 'Hair product/service not found' });
    }

    hair.rating.reviews.push({ userId, userName, rating, comment });

    const total = hair.rating.reviews.reduce((sum, r) => sum + r.rating, 0);
    hair.rating.average = total / hair.rating.reviews.length;
    hair.rating.count = hair.rating.reviews.length;

    await hair.save();

    res.status(201).json({
      status: 'success',
      message: 'Review added successfully',
      data: hair
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get by vendor
export const getByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const hair = await Hair.find({ vendorId, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Hair.countDocuments({ vendorId, isActive: true });

    res.status(200).json({
      status: 'success',
      data: hair,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
