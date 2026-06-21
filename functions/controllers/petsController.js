import Pets from '../models/Pets.js';

// Get all pets products/services
export const getAllPets = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, serviceType, petType, page = 1, limit = 10 } = req.query;

    let filter = { isActive: true };

    if (category) filter.category = category;
    if (serviceType) filter.serviceType = serviceType;
    if (petType) filter['petSpecification.petType'] = petType;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const pets = await Pets.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Pets.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: pets,
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
    const pets = await Pets.find({ isFeatured: true, isActive: true })
      .limit(Number(limit))
      .sort({ rating: -1, createdAt: -1 });

    res.status(200).json({ status: 'success', data: pets });
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
    const pets = await Pets.find({ category, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Pets.countDocuments({ category, isActive: true });

    res.status(200).json({
      status: 'success',
      data: pets,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get by pet type
export const getByPetType = async (req, res) => {
  try {
    const { petType } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const pets = await Pets.find({ 'petSpecification.petType': petType, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Pets.countDocuments({ 'petSpecification.petType': petType, isActive: true });

    res.status(200).json({
      status: 'success',
      data: pets,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get single
export const getPetsById = async (req, res) => {
  try {
    const pets = await Pets.findById(req.params.id).populate('rating.reviews.userId', 'name email');

    if (!pets) {
      return res.status(404).json({ status: 'error', message: 'Pet product/service not found' });
    }

    res.status(200).json({ status: 'success', data: pets });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create
export const createPets = async (req, res) => {
  try {
    const { name, category, price, serviceType } = req.body;

    if (!name || !category || !price || !serviceType) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const vendorId = req.user?._id || req.body.vendorId;
    const vendorName = req.user?.businessName || req.body.vendorName;

    const pets = new Pets({
      ...req.body,
      vendorId,
      vendorName
    });

    await pets.save();

    res.status(201).json({
      status: 'success',
      message: 'Pet product/service created successfully',
      data: pets
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update
export const updatePets = async (req, res) => {
  try {
    const pets = await Pets.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!pets) {
      return res.status(404).json({ status: 'error', message: 'Pet product/service not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Pet updated successfully',
      data: pets
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete
export const deletePets = async (req, res) => {
  try {
    const pets = await Pets.findByIdAndDelete(req.params.id);

    if (!pets) {
      return res.status(404).json({ status: 'error', message: 'Pet product/service not found' });
    }

    res.status(200).json({ status: 'success', message: 'Pet deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Add review
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, userId, userName, petType } = req.body;

    const pets = await Pets.findById(id);
    if (!pets) {
      return res.status(404).json({ status: 'error', message: 'Pet product/service not found' });
    }

    pets.rating.reviews.push({ userId, userName, rating, comment, petType });

    const total = pets.rating.reviews.reduce((sum, r) => sum + r.rating, 0);
    pets.rating.average = total / pets.rating.reviews.length;
    pets.rating.count = pets.rating.reviews.length;

    await pets.save();

    res.status(201).json({
      status: 'success',
      message: 'Review added successfully',
      data: pets
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
    const pets = await Pets.find({ vendorId, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Pets.countDocuments({ vendorId, isActive: true });

    res.status(200).json({
      status: 'success',
      data: pets,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
