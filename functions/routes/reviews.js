import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';

const router = express.Router();

// Get business reviews
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 20, status = 'approved', sortBy = 'recent' } =
      req.query;
    const skip = (page - 1) * limit;

    let filter = { businessId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    let sort = { createdAt: -1 };
    if (sortBy === 'rating') {
      sort = { rating: -1 };
    } else if (sortBy === 'helpful') {
      sort = { helpfulCount: -1 };
    }

    const reviews = await Review.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    // Calculate average rating
    const stats = await Review.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId), status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingsDistribution: {
            $push: '$rating',
          },
        },
      },
    ]);

    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    if (stats.length > 0) {
      stats[0].ratingsDistribution.forEach((rating) => {
        ratingDistribution[rating]++;
      });
    }

    res.status(200).json({
      success: true,
      data: reviews,
      stats: {
        averageRating: stats.length > 0 ? stats[0].averageRating.toFixed(1) : 0,
        totalReviews: total,
        ratingDistribution,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get pending reviews (for vendor)
router.get('/business/:businessId/pending', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ businessId, status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ businessId, status: 'pending' });

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create review
router.post('/', async (req, res) => {
  try {
    const {
      businessId,
      businessType,
      customerId,
      customerName,
      customerEmail,
      orderId,
      productId,
      productName,
      rating,
      title,
      comment,
      images,
      isVerifiedPurchase,
    } = req.body;

    if (
      !businessId ||
      !businessType ||
      !customerName ||
      !rating ||
      !title ||
      !comment
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const review = new Review({
      businessId,
      businessType,
      customerId,
      customerName,
      customerEmail,
      orderId,
      productId,
      productName,
      rating,
      title,
      comment,
      images: images || [],
      isVerifiedPurchase: isVerifiedPurchase || false,
    });

    await review.save();

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Approve review (vendor only)
router.put('/:id/approve', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      data: review,
      message: 'Review approved',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reject review (vendor only)
router.put('/:id/reject', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      data: review,
      message: 'Review rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Respond to review (vendor only)
router.put('/:id/respond', async (req, res) => {
  try {
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required',
      });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        'vendorResponse.text': response,
        'vendorResponse.respondedAt': new Date(),
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      data: review,
      message: 'Response added to review',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Mark review as helpful
router.put('/:id/helpful', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete review
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
