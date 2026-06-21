import TourGuide from '../models/TourGuide.js';

// Get all tour guides
export const getTourGuides = async (req, res) => {
  try {
    const { status, expertise, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (expertise) filter.expertise = { $regex: expertise, $options: 'i' };

    const skip = (page - 1) * limit;
    const guides = await TourGuide.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await TourGuide.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: guides,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tour guides:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get single tour guide
export const getTourGuideById = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await TourGuide.findById(id);

    if (!guide) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour guide not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: guide
    });
  } catch (error) {
    console.error('Error fetching tour guide:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create new tour guide
export const createTourGuide = async (req, res) => {
  try {
    const { name, email, phone, expertise, languages, bio, status } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !expertise) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Check if guide with same email already exists
    const existingGuide = await TourGuide.findOne({ email });
    if (existingGuide) {
      return res.status(400).json({
        status: 'error',
        message: 'A guide with this email already exists'
      });
    }

    const guide = new TourGuide({
      name,
      email,
      phone,
      expertise,
      languages: languages || ['English'],
      bio,
      status: status || 'active'
    });

    await guide.save();

    res.status(201).json({
      status: 'success',
      message: 'Tour guide created successfully',
      data: guide
    });
  } catch (error) {
    console.error('Error creating tour guide:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update tour guide
export const updateTourGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If email is being updated, check for duplicates
    if (updates.email) {
      const existingGuide = await TourGuide.findOne({ email: updates.email, _id: { $ne: id } });
      if (existingGuide) {
        return res.status(400).json({
          status: 'error',
          message: 'A guide with this email already exists'
        });
      }
    }

    const guide = await TourGuide.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!guide) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour guide not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Tour guide updated successfully',
      data: guide
    });
  } catch (error) {
    console.error('Error updating tour guide:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete tour guide
export const deleteTourGuide = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await TourGuide.findByIdAndDelete(id);

    if (!guide) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour guide not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Tour guide deleted successfully',
      data: guide
    });
  } catch (error) {
    console.error('Error deleting tour guide:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update guide status
export const updateGuideStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value'
      });
    }

    const guide = await TourGuide.findByIdAndUpdate(id, { status }, { new: true });

    if (!guide) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour guide not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Guide status updated successfully',
      data: guide
    });
  } catch (error) {
    console.error('Error updating guide status:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update guide rating
export const updateGuideRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 0 and 5'
      });
    }

    const guide = await TourGuide.findByIdAndUpdate(id, { rating }, { new: true });

    if (!guide) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour guide not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Guide rating updated successfully',
      data: guide
    });
  } catch (error) {
    console.error('Error updating guide rating:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Increment tours completed
export const incrementToursCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const guide = await TourGuide.findByIdAndUpdate(
      id,
      { $inc: { toursCompleted: 1 } },
      { new: true }
    );

    if (!guide) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour guide not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Tours completed incremented',
      data: guide
    });
  } catch (error) {
    console.error('Error incrementing tours completed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
