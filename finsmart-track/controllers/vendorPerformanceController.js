import VendorPerformance from '../models/VendorPerformance.js';
import User from '../models/User.js';

// Get vendor performance
export const getVendorPerformance = async (req, res) => {
  try {
    const { vendorId } = req.params;

    let performance = await VendorPerformance.findOne({ vendor: vendorId });

    if (!performance) {
      // Create default performance record if it doesn't exist
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          status: 'error',
          message: 'Vendor not found'
        });
      }

      performance = new VendorPerformance({
        vendor: vendorId,
        vendorType: vendor.vendorType,
        rating: { average: 0, count: 0, distribution: {} },
        reviews: { total: 0, positive: 0, neutral: 0, negative: 0 },
        bookings: { total: 0, completed: 0, cancelled: 0 },
        revenue: { total: 0, thisMonth: 0, lastMonth: 0, thisYear: 0 },
        performanceLevel: 'standard'
      });

      await performance.save();
    }

    res.json({
      status: 'success',
      data: performance
    });
  } catch (error) {
    console.error('Error fetching vendor performance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching vendor performance',
      error: error.message
    });
  }
};

// Update vendor performance metrics
export const updatePerformanceMetrics = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const metricsData = req.body;

    let performance = await VendorPerformance.findOne({ vendor: vendorId });

    if (!performance) {
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          status: 'error',
          message: 'Vendor not found'
        });
      }

      performance = new VendorPerformance({
        vendor: vendorId,
        vendorType: vendor.vendorType
      });
    }

    // Update metrics
    if (metricsData.rating) {
      performance.rating = metricsData.rating;
    }

    if (metricsData.reviews) {
      performance.reviews = metricsData.reviews;
    }

    if (metricsData.bookings) {
      performance.bookings = metricsData.bookings;
    }

    if (metricsData.responseTime) {
      performance.responseTime = metricsData.responseTime;
    }

    if (metricsData.satisfaction) {
      performance.satisfaction = metricsData.satisfaction;
    }

    if (metricsData.revenue) {
      performance.revenue = metricsData.revenue;
    }

    if (metricsData.occupancy) {
      performance.occupancy = metricsData.occupancy;
    }

    if (metricsData.violations) {
      performance.violations = metricsData.violations;
    }

    // Update performance level based on metrics
    updatePerformanceLevel(performance);

    performance.lastUpdated = new Date();
    await performance.save();

    res.json({
      status: 'success',
      message: 'Performance metrics updated successfully',
      data: performance
    });
  } catch (error) {
    console.error('Error updating performance metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating performance metrics',
      error: error.message
    });
  }
};

// Record a review for vendor
export const recordReview = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { rating, sentiment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid rating. Must be between 1 and 5'
      });
    }

    let performance = await VendorPerformance.findOne({ vendor: vendorId });

    if (!performance) {
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          status: 'error',
          message: 'Vendor not found'
        });
      }

      performance = new VendorPerformance({
        vendor: vendorId,
        vendorType: vendor.vendorType
      });
    }

    // Initialize rating if needed
    if (!performance.rating || !performance.rating.distribution) {
      performance.rating = { average: 0, count: 0, distribution: {} };
    }

    // Update rating distribution
    performance.rating.distribution[rating] = (performance.rating.distribution[rating] || 0) + 1;

    // Recalculate average rating
    let totalRatingPoints = 0;
    let totalRatings = 0;

    Object.entries(performance.rating.distribution).forEach(([ratingKey, count]) => {
      totalRatingPoints += parseInt(ratingKey) * count;
      totalRatings += count;
    });
    performance.rating.average = totalRatings > 0 ? (totalRatingPoints / totalRatings).toFixed(1) : 0;
    performance.rating.count = totalRatings;

    // Update reviews
    if (!performance.reviews) {
      performance.reviews = { total: 0, positive: 0, neutral: 0, negative: 0 };
    }
    performance.reviews.total++;
    if (sentiment === 'positive') {
      performance.reviews.positive++;
    } else if (sentiment === 'neutral') {
      performance.reviews.neutral++;
    } else if (sentiment === 'negative') {
      performance.reviews.negative++;
    }

    // Update badges
    if (!performance.badges || !Array.isArray(performance.badges)) {
      performance.badges = [];
    }
    if (performance.rating.average >= 4.8 && performance.rating.count >= 50) {
      if (!performance.badges.includes('highly-rated')) {
        performance.badges.push('highly-rated');
      }
    }

    updatePerformanceLevel(performance);
    performance.lastUpdated = new Date();
    await performance.save();

    res.json({
      status: 'success',
      message: 'Review recorded successfully',
      data: performance
    });
  } catch (error) {
    console.error('Error recording review:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error recording review',
      error: error.message
    });
  }
};

// Record booking for vendor
export const recordBooking = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { amount, status } = req.body;

    let performance = await VendorPerformance.findOne({ vendor: vendorId });

    if (!performance) {
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          status: 'error',
          message: 'Vendor not found'
        });
      }

      performance = new VendorPerformance({
        vendor: vendorId,
        vendorType: vendor.vendorType
      });
    }

    performance.bookings.total++;

    if (status === 'completed') {
      performance.bookings.completed++;
    } else if (status === 'cancelled') {
      performance.bookings.cancelled++;
    }

    // Update cancellation rate
    if (performance.bookings.total > 0) {
      performance.bookings.cancellationRate = (performance.bookings.cancelled / performance.bookings.total) * 100;
    }

    // Update revenue
    if (amount) {
      performance.revenue.total += amount;
      performance.revenue.thisMonth += amount;
      performance.revenue.thisYear += amount;
      performance.revenue.averagePerBooking = performance.revenue.total / performance.bookings.completed;
    }

    updatePerformanceLevel(performance);
    performance.lastUpdated = new Date();
    await performance.save();

    res.json({
      status: 'success',
      message: 'Booking recorded successfully',
      data: performance
    });
  } catch (error) {
    console.error('Error recording booking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error recording booking',
      error: error.message
    });
  }
};

// Add monthly performance history
export const addMonthlyPerformance = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { month, revenue, bookings, rating, cancellations, reviews } = req.body;

    let performance = await VendorPerformance.findOne({ vendor: vendorId });

    if (!performance) {
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          status: 'error',
          message: 'Vendor not found'
        });
      }

      performance = new VendorPerformance({
        vendor: vendorId,
        vendorType: vendor.vendorType
      });
    }

    performance.monthlyPerformance.push({
      month: new Date(month),
      revenue,
      bookings,
      rating,
      cancellations,
      reviews
    });

    // Keep only last 24 months
    if (performance.monthlyPerformance.length > 24) {
      performance.monthlyPerformance = performance.monthlyPerformance.slice(-24);
    }

    await performance.save();

    res.json({
      status: 'success',
      message: 'Monthly performance recorded successfully',
      data: performance
    });
  } catch (error) {
    console.error('Error adding monthly performance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error adding monthly performance',
      error: error.message
    });
  }
};

// Get top performers
export const getTopPerformers = async (req, res) => {
  try {
    const { vendorType = '', limit = 10 } = req.query;

    let query = {};
    if (vendorType) {
      query.vendorType = vendorType;
    }

    const topPerformers = await VendorPerformance.find(query)
      .populate('vendor', 'name email phone')
      .sort({ 'rating.average': -1, 'rating.count': -1 })
      .limit(parseInt(limit));

    res.json({
      status: 'success',
      data: topPerformers
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching top performers',
      error: error.message
    });
  }
};

// Get vendors needing improvement
export const getVendorsNeedingImprovement = async (req, res) => {
  try {
    const { vendorType = '', limit = 10 } = req.query;

    let query = { performanceLevel: 'needs-improvement' };
    if (vendorType) {
      query.vendorType = vendorType;
    }

    const needsImprovement = await VendorPerformance.find(query)
      .populate('vendor', 'name email phone status')
      .limit(parseInt(limit));

    res.json({
      status: 'success',
      data: needsImprovement
    });
  } catch (error) {
    console.error('Error fetching vendors needing improvement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching vendors needing improvement',
      error: error.message
    });
  }
};

// Helper function to determine performance level
function updatePerformanceLevel(performance) {
  const rating = performance.rating?.average || 0;
  const responseRate = performance.responseRate || 0;
  const cancellationRate = performance.bookings?.cancellationRate || 0;

  // Superhost criteria
  if (rating >= 4.8 && responseRate >= 90 && cancellationRate <= 5) {
    performance.performanceLevel = 'superhost';
    if (!performance.badges || !Array.isArray(performance.badges)) {
      performance.badges = [];
    }
    if (!performance.badges.includes('superhost')) {
      performance.badges.push('superhost');
    }
  }
  // Professional
  else if (rating >= 4.5 && responseRate >= 80 && cancellationRate <= 10) {
    performance.performanceLevel = 'professional';
  }
  // Needs improvement
  else if (rating < 3.5 || responseRate < 50 || cancellationRate > 20) {
    performance.performanceLevel = 'needs-improvement';
  }
  // Standard
  else {
    performance.performanceLevel = 'standard';
  }
}
