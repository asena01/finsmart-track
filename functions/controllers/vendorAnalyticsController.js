import Vendor from '../models/Vendor.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Promotion from '../models/Promotion.js';
import Alert from '../models/Alert.js';

// Get analytics dashboard data
export const getAnalyticsDashboard = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30' } = req.query; // 7, 30, 90 days

    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Get orders
    const orders = await Order.find({ createdAt: { $gte: daysAgo } });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get daily revenue data
    const dailyRevenue = [];
    for (let i = 0; i < parseInt(period); i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayOrders = orders.filter(
        o => new Date(o.createdAt).toDateString() === date.toDateString()
      );
      dailyRevenue.push({
        date: date.toLocaleDateString(),
        revenue: dayOrders.reduce((sum, order) => sum + order.total, 0),
        orders: dayOrders.length
      });
    }

    // Get payment method distribution
    const paymentMethods = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOrders,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          period
        },
        dailyRevenue: dailyRevenue.reverse(),
        paymentMethods,
        topOrders: orders.slice(-5).reverse()
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch analytics'
    });
  }
};

// Get product reviews
export const getProductReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const reviews = await Review.find({ vendorId: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Review.countDocuments({ vendorId: userId });

    // Calculate statistics
    const allReviews = await Review.find({ vendorId: userId });
    const avgRating = allReviews.length > 0
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(2)
      : 0;

    return res.status(200).json({
      status: 'success',
      data: reviews,
      stats: {
        totalReviews: total,
        averageRating: parseFloat(avgRating),
        ratingDistribution: getRatingDistribution(allReviews)
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch reviews'
    });
  }
};

// Respond to review
export const respondToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        response: {
          text: response,
          respondedAt: new Date()
        }
      },
      { new: true }
    );

    return res.status(200).json({
      status: 'success',
      data: review,
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Error responding to review:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to respond to review'
    });
  }
};

// Create promotion
export const createPromotion = async (req, res) => {
  try {
    const { userId } = req.params;
    const promotionData = req.body;

    promotionData.vendorId = userId;

    // Generate promo code if not provided
    if (!promotionData.code) {
      promotionData.code = generatePromoCode();
    }

    const promotion = new Promotion(promotionData);
    await promotion.save();

    return res.status(201).json({
      status: 'success',
      data: promotion,
      message: 'Promotion created successfully'
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create promotion'
    });
  }
};

// Get promotions
export const getPromotions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { active = true } = req.query;

    const query = { vendorId: userId };
    if (active !== 'all') {
      query.active = active === 'true';
    }

    const promotions = await Promotion.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: promotions
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch promotions'
    });
  }
};

// Update promotion
export const updatePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const updates = req.body;

    const promotion = await Promotion.findByIdAndUpdate(promotionId, updates, { new: true });

    return res.status(200).json({
      status: 'success',
      data: promotion,
      message: 'Promotion updated successfully'
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update promotion'
    });
  }
};

// Delete promotion
export const deletePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;

    await Promotion.findByIdAndDelete(promotionId);

    return res.status(200).json({
      status: 'success',
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete promotion'
    });
  }
};

// Get inventory alerts
export const getAlerts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { unread = false } = req.query;

    const query = { vendorId: userId };
    if (unread === 'true') {
      query.read = false;
    }

    const alerts = await Alert.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: alerts,
      unreadCount: await Alert.countDocuments({ vendorId: userId, read: false })
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch alerts'
    });
  }
};

// Mark alert as read
export const markAlertAsRead = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      alertId,
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    return res.status(200).json({
      status: 'success',
      data: alert
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to mark alert as read'
    });
  }
};

// Bulk import products
export const bulkImportProducts = async (req, res) => {
  try {
    const { userId, vendorType } = req.params;
    const csvData = req.body.products; // Array of product objects

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No products provided'
      });
    }

    const importedProducts = [];
    const errors = [];

    for (let i = 0; i < csvData.length; i++) {
      try {
        const productData = csvData[i];
        productData.vendorId = userId;

        // Here you would create products based on vendorType
        // For now, just track successful imports
        importedProducts.push({
          name: productData.name,
          status: 'imported'
        });
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        imported: importedProducts.length,
        failed: errors.length,
        total: csvData.length,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Successfully imported ${importedProducts.length} products`
    });
  } catch (error) {
    console.error('Error bulk importing products:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to import products'
    });
  }
};

// Helper functions
function getRatingDistribution(reviews) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(review => {
    distribution[review.rating]++;
  });
  return distribution;
}

function generatePromoCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

    return res.status(200).json({
      status: 'success',
      data: order,
      message: 'Order status updated'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update order status'
    });
  }
};
