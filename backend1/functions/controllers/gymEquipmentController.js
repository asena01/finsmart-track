import GymEquipment from '../models/GymEquipment.js';

// Get all gym equipment
export const getAllEquipment = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, fitnessLevel, targetMuscle, page = 1, limit = 10 } = req.query;

    let filter = { isActive: true };

    if (category) filter.category = category;
    if (fitnessLevel) filter['specifications.fitnessLevel'] = fitnessLevel;
    if (targetMuscle) filter['specifications.targetMuscles'] = targetMuscle;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const equipment = await GymEquipment.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ isFeatured: -1, createdAt: -1 });

    const total = await GymEquipment.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: equipment,
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
    const equipment = await GymEquipment.find({ isFeatured: true, isActive: true })
      .limit(Number(limit))
      .sort({ rating: -1, createdAt: -1 });

    res.status(200).json({ status: 'success', data: equipment });
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
    const equipment = await GymEquipment.find({ category, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await GymEquipment.countDocuments({ category, isActive: true });

    res.status(200).json({
      status: 'success',
      data: equipment,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get by fitness level
export const getByFitnessLevel = async (req, res) => {
  try {
    const { level } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const equipment = await GymEquipment.find({ 'specifications.fitnessLevel': level, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await GymEquipment.countDocuments({ 'specifications.fitnessLevel': level, isActive: true });

    res.status(200).json({
      status: 'success',
      data: equipment,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get by target muscle
export const getByTargetMuscle = async (req, res) => {
  try {
    const { muscle } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const equipment = await GymEquipment.find({ 'specifications.targetMuscles': muscle, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await GymEquipment.countDocuments({ 'specifications.targetMuscles': muscle, isActive: true });

    res.status(200).json({
      status: 'success',
      data: equipment,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get single
export const getEquipmentById = async (req, res) => {
  try {
    const equipment = await GymEquipment.findById(req.params.id).populate('rating.reviews.userId', 'name email');

    if (!equipment) {
      return res.status(404).json({ status: 'error', message: 'Equipment not found' });
    }

    res.status(200).json({ status: 'success', data: equipment });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create
export const createEquipment = async (req, res) => {
  try {
    const { name, category, price } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const vendorId = req.user?._id || req.body.vendorId;
    const vendorName = req.user?.businessName || req.body.vendorName;

    const equipment = new GymEquipment({
      ...req.body,
      vendorId,
      vendorName
    });

    await equipment.save();

    res.status(201).json({
      status: 'success',
      message: 'Equipment created successfully',
      data: equipment
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update
export const updateEquipment = async (req, res) => {
  try {
    const equipment = await GymEquipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({ status: 'error', message: 'Equipment not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Equipment updated successfully',
      data: equipment
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete
export const deleteEquipment = async (req, res) => {
  try {
    const equipment = await GymEquipment.findByIdAndDelete(req.params.id);

    if (!equipment) {
      return res.status(404).json({ status: 'error', message: 'Equipment not found' });
    }

    res.status(200).json({ status: 'success', message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Add review
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, userId, userName, verified } = req.body;

    const equipment = await GymEquipment.findById(id);
    if (!equipment) {
      return res.status(404).json({ status: 'error', message: 'Equipment not found' });
    }

    equipment.rating.reviews.push({ userId, userName, rating, comment, verified });

    const total = equipment.rating.reviews.reduce((sum, r) => sum + r.rating, 0);
    equipment.rating.average = total / equipment.rating.reviews.length;
    equipment.rating.count = equipment.rating.reviews.length;

    await equipment.save();

    res.status(201).json({
      status: 'success',
      message: 'Review added successfully',
      data: equipment
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
    const equipment = await GymEquipment.find({ vendorId, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await GymEquipment.countDocuments({ vendorId, isActive: true });

    res.status(200).json({
      status: 'success',
      data: equipment,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
