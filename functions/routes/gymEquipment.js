import express from 'express';
import * as gymEquipmentController from '../controllers/gymEquipmentController.js';

const router = express.Router();

// Specific routes BEFORE generic
router.get('/featured', gymEquipmentController.getFeatured);
router.get('/category/:category', gymEquipmentController.getByCategory);
router.get('/fitness-level/:level', gymEquipmentController.getByFitnessLevel);
router.get('/target-muscle/:muscle', gymEquipmentController.getByTargetMuscle);
router.get('/vendor/:vendorId', gymEquipmentController.getByVendor);

// Generic routes
router.get('/', gymEquipmentController.getAllEquipment);
router.get('/:id', gymEquipmentController.getEquipmentById);
router.post('/', gymEquipmentController.createEquipment);
router.put('/:id', gymEquipmentController.updateEquipment);
router.delete('/:id', gymEquipmentController.deleteEquipment);
router.post('/:id/review', gymEquipmentController.addReview);

export default router;
