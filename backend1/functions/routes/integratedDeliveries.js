import express from 'express';
import {
  createDelivery,
  getBusinessDeliveries,
  getDeliveryDetails,
  updateDeliveryStatus,
  getActiveDeliveries,
  rateDelivery,
  cancelDelivery,
  getDeliveryStats
} from '../controllers/integratedDeliveryController.js';

const router = express.Router();

// Create new delivery with integrated provider
router.post('/', createDelivery);

// Get deliveries for a business
// GET /:businessType/:businessId/integrated-deliveries
router.get('/:businessType/:businessId', getBusinessDeliveries);

// Get active deliveries for tracking
router.get('/:businessType/:businessId/active', getActiveDeliveries);

// Get delivery statistics
router.get('/:businessType/:businessId/stats', getDeliveryStats);

// Get specific delivery details
router.get('/:deliveryId/details', getDeliveryDetails);

// Update delivery status
router.put('/:deliveryId/status', updateDeliveryStatus);

// Rate delivery
router.put('/:deliveryId/rate', rateDelivery);

// Cancel delivery
router.put('/:deliveryId/cancel', cancelDelivery);

export default router;
