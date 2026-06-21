import express from 'express';
import * as hairController from '../controllers/hairController.js';

const router = express.Router();

// Specific routes BEFORE generic
router.get('/featured', hairController.getFeatured);
router.get('/category/:category', hairController.getByCategory);
router.get('/type/:type', hairController.getByType);
router.get('/vendor/:vendorId', hairController.getByVendor);

// Generic routes
router.get('/', hairController.getAllHair);
router.get('/:id', hairController.getHairById);
router.post('/', hairController.createHair);
router.put('/:id', hairController.updateHair);
router.delete('/:id', hairController.deleteHair);
router.post('/:id/review', hairController.addReview);

export default router;
