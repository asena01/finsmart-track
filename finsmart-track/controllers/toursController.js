import Tour from '../models/Tour.js';

// GET all tours with pagination, filters, and search
export const getAllTours = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { destination, difficulty, search, minPrice, maxPrice } = req.query;

    const skip = (page - 1) * limit;
    const filter = { isActive: true };

    if (destination) {
      filter.destination = { $regex: destination, $options: 'i' };
    }
    if (difficulty) {
      filter.difficulty = difficulty;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ];
    }

    const tours = await Tour.find(filter)
      .populate('tourOperator', 'name email phone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Tour.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: tours,
      pagination: {
        total,
        page,
        limit,
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

// GET single tour by ID
export const getTourById = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id)
      .populate('tourOperator', 'name email phone');

    if (!tour) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// CREATE new tour
export const createTour = async (req, res) => {
  try {
    const {
      name,
      destination,
      price,
      duration,
      difficulty,
      groupSize,
      highlights,
      includes,
      image,
      images,
      rating,
      reviews,
      maxParticipants,
      description,
      tourOperator,
      operatorName,
      operatorPhone,
      operatorEmail,
      location,
      itinerary,
      amenities,
      languages,
      startDate,
      endDate
    } = req.body;

    // Validate required fields
    if (!name || !destination || !price || !duration || !groupSize || !tourOperator) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, destination, price, duration, groupSize, tourOperator'
      });
    }

    const tour = new Tour({
      name,
      destination,
      price,
      duration,
      difficulty,
      groupSize,
      highlights,
      includes,
      image,
      images,
      rating,
      reviews,
      maxParticipants,
      description,
      tourOperator,
      operatorName,
      operatorPhone,
      operatorEmail,
      location,
      itinerary,
      amenities,
      languages,
      startDate,
      endDate
    });

    await tour.save();

    res.status(201).json({
      status: 'success',
      message: 'Tour created successfully',
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// UPDATE tour
export const updateTour = async (req, res) => {
  try {
    const { id } = req.params;

    const tour = await Tour.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!tour) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Tour updated successfully',
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// DELETE tour
export const deleteTour = async (req, res) => {
  try {
    const { id } = req.params;

    const tour = await Tour.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!tour) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Tour deleted successfully',
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET tours by destination
export const getToursByDestination = async (req, res) => {
  try {
    const { destination } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const tours = await Tour.find({
      destination: { $regex: destination, $options: 'i' },
      isActive: true
    })
      .populate('tourOperator', 'name email phone')
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: tours
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET tours by difficulty
export const getToursByDifficulty = async (req, res) => {
  try {
    const { difficulty } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const tours = await Tour.find({
      difficulty,
      isActive: true
    })
      .populate('tourOperator', 'name email phone')
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: tours
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET featured tours (top-rated)
export const getFeaturedTours = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;

    const tours = await Tour.find({ isActive: true })
      .populate('tourOperator', 'name email phone')
      .sort({ rating: -1, reviews: -1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: tours
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// UPDATE tour rating
export const updateTourRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, reviews } = req.body;

    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 0 and 5'
      });
    }

    const tour = await Tour.findByIdAndUpdate(
      id,
      { rating, reviews: reviews || undefined },
      { new: true }
    );

    if (!tour) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Tour rating updated successfully',
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// UPDATE tour participants
export const updateTourParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentParticipants } = req.body;

    const tour = await Tour.findById(id);

    if (!tour) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour not found'
      });
    }

    if (currentParticipants > tour.maxParticipants) {
      return res.status(400).json({
        status: 'error',
        message: 'Participants cannot exceed maximum capacity'
      });
    }

    tour.currentParticipants = currentParticipants;
    await tour.save();

    res.status(200).json({
      status: 'success',
      message: 'Tour participants updated successfully',
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// SEARCH tours
export const searchTours = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    const tours = await Tour.find(
      { $text: { $search: query }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .populate('tourOperator', 'name email phone')
      .limit(20);

    res.status(200).json({
      status: 'success',
      data: tours
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET agency info
export const getAgencyInfo = async (req, res) => {
  try {
    const { agencyId } = req.params;

    const agency = await Tour.findOne({ tourOperator: agencyId })
      .populate('tourOperator', 'name email phone businessName');

    if (!agency || !agency.tourOperator) {
      return res.status(404).json({
        status: 'error',
        message: 'Agency not found'
      });
    }

    const agencyData = {
      id: agency.tourOperator._id,
      name: agency.tourOperator.businessName || agency.tourOperator.name,
      email: agency.tourOperator.email,
      phone: agency.tourOperator.phone,
      city: agency.location?.city || 'N/A',
      country: agency.location?.country || 'N/A'
    };

    res.status(200).json({
      status: 'success',
      data: agencyData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET bookings
export const getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Since we don't have a separate Booking model yet, return empty bookings
    // This endpoint is ready for future integration with a Booking model
    const bookings = [];

    res.status(200).json({
      status: 'success',
      data: bookings,
      pagination: {
        total: 0,
        page,
        limit,
        pages: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET tour packages (alias for getAllTours)
export const getTourPackages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const packages = await Tour.find({ isActive: true })
      .populate('tourOperator', 'name email phone businessName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Tour.countDocuments({ isActive: true });

    res.status(200).json({
      status: 'success',
      data: packages,
      pagination: {
        total,
        page,
        limit,
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
