import express from 'express';
import {
  getAllDeliveries,
  getActiveDeliveries,
  createDelivery,
  getDeliveryById,
  updateDeliveryStatus,
  updateProofOfDelivery,
  getProviderDeliveries,
  getCustomerDeliveries,
  calculatePrice,
  rateDelivery
} from '../controllers/deliveryController.js';

const router = express.Router();

// Specific routes first
router.get('/active', getActiveDeliveries);
router.get('/calculate-price', calculatePrice);
router.get('/provider/:providerId', getProviderDeliveries);
router.get('/customer/:customerId', getCustomerDeliveries);

// Generic routes
router.post('/', createDelivery);
router.get('/:id', getDeliveryById);
router.put('/:id/status', updateDeliveryStatus);
router.put('/:id/proof', updateProofOfDelivery);
router.put('/:id/rate', rateDelivery);
router.get('/', getAllDeliveries);

export default router;
