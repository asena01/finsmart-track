import express from 'express';
import {
  getAllServices,
  getFeaturedServices,
  getServicesByCategory,
  getServicesByCity,
  getServiceById,
  createService,
  updateService,
  deleteService,
  updateServiceRating,
  updateServiceAvailability,
  searchServices,
  getProviderServices
} from '../controllers/servicesController.js';

const router = express.Router();

// Specific routes first (avoid conflicts with /:id)
router.get('/featured', getFeaturedServices);
router.get('/search', searchServices);
router.get('/category/:category', getServicesByCategory);
router.get('/city/:city', getServicesByCity);
router.get('/provider/:providerId', getProviderServices);

// Generic routes
router.get('/:id', getServiceById);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);
router.put('/:id/rating', updateServiceRating);
router.put('/:id/availability', updateServiceAvailability);
router.get('/', getAllServices);

export default router;
