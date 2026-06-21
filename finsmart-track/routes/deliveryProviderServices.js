import express from 'express';
import {
  getProviderServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServicesByCategory,
  searchServices,
  updateServiceStats
} from '../controllers/deliveryProviderServiceController.js';

const router = express.Router();

// Search endpoint (should be before :id to avoid route conflicts)
router.get('/search', searchServices);

// Category-based endpoints
router.get('/category/:category', getServicesByCategory);

// Provider-specific routes
// GET /delivery-providers/:providerId/services
router.get('/:providerId/services', getProviderServices);

// POST /delivery-providers/:providerId/services
router.post('/:providerId/services', createService);

// GET /delivery-providers/:providerId/services/:serviceId
router.get('/:providerId/services/:serviceId', getServiceById);

// PUT /delivery-providers/:providerId/services/:serviceId
router.put('/:providerId/services/:serviceId', updateService);

// DELETE /delivery-providers/:providerId/services/:serviceId
router.delete('/:providerId/services/:serviceId', deleteService);

// PUT /delivery-providers/:providerId/services/:serviceId/stats
router.put('/:providerId/services/:serviceId/stats', updateServiceStats);

export default router;
