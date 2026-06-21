import Furniture from '../models/Furniture.js';

// Get all furniture with filters
export const getAllFurniture = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 10, isFeatured } = req.query;

    let filter = { isActive: true };

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.$text = { $search: search };
    }
    if (isFeatured) filter.isFeatured = isFeatured === 'true';

    const skip = (page - 1) * limit;
    const furniture = await Furniture.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ isFeatured: -1, createdAt: -1 });

    const total = await Furniture.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: furniture,
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

// Get featured furniture
export const getFeaturedFurniture = async (req, res) => {
  try {
    const limit = req.query.limit || 6;
    const furniture = await Furniture.find({ isFeatured: true, isActive: true })
      .limit(Number(limit))
      .sort({ rating: -1, createdAt: -1 });

    res.status(200).json({ status: 'success', data: furniture });
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
    const furniture = await Furniture.find({ category, isActive: true })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Furniture.countDocuments({ category, isActive: true });

    res.status(200).json({
      status: 'success',
      data: furniture,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get single furniture
export const getFurnitureById = async (req, res) => {
  try {
    const furniture = await Furniture.findById(req.params.id).populate('rating.reviews.userId', 'name email');

    if (!furniture) {
      return res.status(404).json({ status: 'error', message: 'Furniture not found' });
    }

    res.status(200).json({ status: 'success', data: furniture });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create furniture (vendor only)
export const createFurniture = async (req, res) => {
  try {
    const { name, category, price, description } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const vendorId = req.user?._id || req.body.vendorId;
    const vendorName = req.user?.businessName || req.body.vendorName;

    const furniture = new Furniture({
      ...req.body,
      vendorId,
      vendorName
    });

    await furniture.save();

    res.status(201).json({
      status: 'success',
      message: 'Furniture created successfully',
      data: furniture
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update furniture
export const updateFurniture = async (req, res) => {
  try {
    const furniture = await Furniture.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!furniture) {
      return res.status(404).json({ status: 'error', message: 'Furniture not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Furniture updated successfully',
      data: furniture
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete furniture
export const deleteFurniture = async (req, res) => {
  try {
    const furniture = await Furniture.findByIdAndDelete(req.params.id);

    if (!furniture) {
      return res.status(404).json({ status: 'error', message: 'Furniture not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Furniture deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Add review
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, userId, userName } = req.body;

    const furniture = await Furniture.findById(id);
    if (!furniture) {
      return res.status(404).json({ status: 'error', message: 'Furniture not found' });
    }

    furniture.rating.reviews.push({
      userId,
      userName,
      rating,
      comment
    });

    // Calculate average rating
    const total = furniture.rating.reviews.reduce((sum, r) => sum + r.rating, 0);
    furniture.rating.average = total / furniture.rating.reviews.length;
    furniture.rating.count = furniture.rating.reviews.length;

    await furniture.save();

    res.status(201).json({
      status: 'success',
      message: 'Review added successfully',
      data: furniture
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get by price range
export const getByPriceRange = async (req, res) => {
  try {
    const { minPrice, maxPrice, page = 1, limit = 10 } = req.query;

    const filter = {
      isActive: true,
      price: {
        $gte: Number(minPrice) || 0,
        $lte: Number(maxPrice) || 999999
      }
    };

    const skip = (page - 1) * limit;
    const furniture = await Furniture.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ price: 1 });

    const total = await Furniture.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: furniture,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
