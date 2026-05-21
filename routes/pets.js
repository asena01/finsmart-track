import express from 'express';
import * as petsController from '../controllers/petsController.js';

const router = express.Router();

// Specific routes BEFORE generic
router.get('/featured', petsController.getFeatured);
router.get('/category/:category', petsController.getByCategory);
router.get('/pettype/:petType', petsController.getByPetType);
router.get('/vendor/:vendorId', petsController.getByVendor);

// Generic routes
router.get('/', petsController.getAllPets);
router.get('/:id', petsController.getPetsById);
router.post('/', petsController.createPets);
router.put('/:id', petsController.updatePets);
router.delete('/:id', petsController.deletePets);
router.post('/:id/review', petsController.addReview);

export default router;
