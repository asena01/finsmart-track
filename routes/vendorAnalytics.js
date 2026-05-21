import express from 'express';
import {
  getAnalyticsDashboard,
  getProductReviews,
  respondToReview,
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  getAlerts,
  markAlertAsRead,
  bulkImportProducts,
  updateOrderStatus
} from '../controllers/vendorAnalyticsController.js';

const router = express.Router();

// Analytics Routes
router.get('/analytics/:userId', getAnalyticsDashboard);

// Reviews Routes
router.get('/reviews/:userId', getProductReviews);
router.post('/reviews/:reviewId/respond', respondToReview);

// Promotions Routes
router.get('/promotions/:userId', getPromotions);
router.post('/promotions/:userId', createPromotion);
router.put('/promotions/:promotionId', updatePromotion);
router.delete('/promotions/:promotionId', deletePromotion);

// Alerts Routes
router.get('/alerts/:userId', getAlerts);
router.put('/alerts/:alertId/read', markAlertAsRead);

// Order Routes
router.put('/orders/:orderId/status', updateOrderStatus);

// Bulk Import Routes
router.post('/import/:userId/:vendorType', bulkImportProducts);

export default router;
