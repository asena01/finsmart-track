import express from 'express';
import {
  getAnalyticsStats,
  getOccupancyTrend,
  getRevenueTrend,
  getOccupancyData,
  updateOccupancyRecord,
  recalculateOccupancy
} from '../controllers/analyticsController.js';

const router = express.Router({ mergeParams: true });

// Get analytics statistics
router.get('/stats', getAnalyticsStats);

// Get occupancy trend
router.get('/occupancy-trend', getOccupancyTrend);

// Get revenue trend
router.get('/revenue-trend', getRevenueTrend);

// Get occupancy data
router.get('/occupancy-data', getOccupancyData);

// Update occupancy record
router.post('/update', updateOccupancyRecord);

// Recalculate occupancy from actual data
router.post('/recalculate', recalculateOccupancy);

export default router;
