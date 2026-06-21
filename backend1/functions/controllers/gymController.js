import Gym from '../models/Gym.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new gym class/program
 * POST /api/gym
 */
export const createGymClass = asyncHandler(async (req, res) => {
  const { name, description, category, price, duration, difficulty, maxCapacity, instructor } = req.body;
  const gymId = req.user._id;
  const gymName = req.user.businessName || req.user.name;

  if (!name || !description || !category || !price || !duration || !difficulty || !maxCapacity) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide all required fields'
    });
  }

  const gymClass = await Gym.create({
    name,
    description,
    category,
    price,
    duration,
    difficulty,
    maxCapacity,
    availableSlots: maxCapacity,
    instructor,
    gymId,
    gymName,
    ...req.body
  });

  res.status(201).json({
    status: 'success',
    data: gymClass,
    message: 'Gym class created successfully'
  });
});

/**
 * Get all gym classes for a specific gym
 * GET /api/gym/:gymId
 */
export const getGymClasses = asyncHandler(async (req, res) => {
  const { gymId } = req.params;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const skip = (page - 1) * limit;

  const classes = await Gym.find({ gymId })
    .limit(limit * 1)
    .skip(skip)
    .sort({ createdAt: -1 });

  const total = await Gym.countDocuments({ gymId });

  res.status(200).json({
    status: 'success',
    data: classes,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get all gym classes by category
 * GET /api/gym/category/:category
 */
export const getClassesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const skip = (page - 1) * limit;

  const classes = await Gym.find({ category, isActive: true })
    .limit(limit * 1)
    .skip(skip)
    .sort({ rating: -1, createdAt: -1 });

  const total = await Gym.countDocuments({ category, isActive: true });

  res.status(200).json({
    status: 'success',
    data: classes,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get a single gym class by ID
 * GET /api/gym/class/:classId
 */
export const getGymClassById = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const gymClass = await Gym.findById(classId);

  if (!gymClass) {
    return res.status(404).json({
      status: 'error',
      message: 'Gym class not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: gymClass
  });
});

/**
 * Update gym class
 * PUT /api/gym/class/:classId
 */
export const updateGymClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const gymClass = await Gym.findByIdAndUpdate(classId, req.body, {
    new: true,
    runValidators: true
  });

  if (!gymClass) {
    return res.status(404).json({
      status: 'error',
      message: 'Gym class not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: gymClass,
    message: 'Gym class updated successfully'
  });
});

/**
 * Delete gym class
 * DELETE /api/gym/class/:classId
 */
export const deleteGymClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const gymClass = await Gym.findByIdAndDelete(classId);

  if (!gymClass) {
    return res.status(404).json({
      status: 'error',
      message: 'Gym class not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Gym class deleted successfully'
  });
});

/**
 * Search gym classes by name or description
 * GET /api/gym/search?query=yoga
 */
export const searchGymClasses = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  if (!query) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide search query'
    });
  }

  const skip = (page - 1) * limit;

  const classes = await Gym.find(
    { $text: { $search: query }, isActive: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit * 1)
    .skip(skip);

  const total = await Gym.countDocuments({ $text: { $search: query }, isActive: true });

  res.status(200).json({
    status: 'success',
    data: classes,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Enroll user in gym class
 * POST /api/gym/class/:classId/enroll
 */
export const enrollInClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const userId = req.user._id;

  const gymClass = await Gym.findById(classId);

  if (!gymClass) {
    return res.status(404).json({
      status: 'error',
      message: 'Gym class not found'
    });
  }

  if (gymClass.availableSlots <= 0) {
    if (!gymClass.waitlistEnabled) {
      return res.status(400).json({
        status: 'error',
        message: 'Class is full and waitlist is disabled'
      });
    }

    // Add to waitlist
    gymClass.waitlist.push({
      userId,
      userName: req.user.name
    });
    await gymClass.save();

    return res.status(200).json({
      status: 'success',
      message: 'Added to waitlist',
      data: gymClass
    });
  }

  // Reduce available slots
  gymClass.availableSlots -= 1;
  gymClass.currentEnrollment += 1;
  await gymClass.save();

  res.status(200).json({
    status: 'success',
    message: 'Enrolled in class successfully',
    data: gymClass
  });
});

/**
 * Get featured gym classes
 * GET /api/gym/featured?limit=10
 */
export const getFeaturedClasses = asyncHandler(async (req, res) => {
  const limit = req.query.limit || 10;

  const classes = await Gym.find({ isFeatured: true, isActive: true })
    .limit(limit * 1)
    .sort({ rating: -1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: classes
  });
});

/**
 * Get gym classes by difficulty level
 * GET /api/gym/difficulty/:level
 */
export const getClassesByDifficulty = asyncHandler(async (req, res) => {
  const { level } = req.params;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const skip = (page - 1) * limit;

  const validDifficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  if (!validDifficulties.includes(level)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid difficulty level. Must be one of: ${validDifficulties.join(', ')}`
    });
  }

  const classes = await Gym.find({ difficulty: level, isActive: true })
    .limit(limit * 1)
    .skip(skip)
    .sort({ rating: -1 });

  const total = await Gym.countDocuments({ difficulty: level, isActive: true });

  res.status(200).json({
    status: 'success',
    data: classes,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Add review to gym class
 * POST /api/gym/class/:classId/review
 */
export const addReview = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  if (!rating || !comment) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide rating and comment'
    });
  }

  const gymClass = await Gym.findById(classId);

  if (!gymClass) {
    return res.status(404).json({
      status: 'error',
      message: 'Gym class not found'
    });
  }

  const review = {
    userId,
    userName: req.user.name,
    userImage: req.user.profileImage,
    rating,
    comment,
    verified: true,
    createdAt: new Date()
  };

  gymClass.rating.reviews.push(review);
  gymClass.rating.count = gymClass.rating.reviews.length;

  // Calculate average rating
  const totalRating = gymClass.rating.reviews.reduce((sum, r) => sum + r.rating, 0);
  gymClass.rating.average = Math.round((totalRating / gymClass.rating.count) * 10) / 10;

  await gymClass.save();

  res.status(201).json({
    status: 'success',
    data: gymClass,
    message: 'Review added successfully'
  });
});
