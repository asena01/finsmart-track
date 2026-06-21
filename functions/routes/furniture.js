import express from 'express';
import * as furnitureController from '../controllers/furnitureController.js';

const router = express.Router();

// Specific routes BEFORE generic routes
router.get('/featured', furnitureController.getFeaturedFurniture);
router.get('/category/:category', furnitureController.getByCategory);
router.get('/price-range', furnitureController.getByPriceRange);

// Generic routes
router.get('/', furnitureController.getAllFurniture);
router.get('/:id', furnitureController.getFurnitureById);
router.post('/', furnitureController.createFurniture);
router.put('/:id', furnitureController.updateFurniture);
router.delete('/:id', furnitureController.deleteFurniture);
router.post('/:id/review', furnitureController.addReview);

export default router;
