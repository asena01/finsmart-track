import express from 'express';
import {
  createGymClass,
  getGymClasses,
  getClassesByCategory,
  getGymClassById,
  updateGymClass,
  deleteGymClass,
  searchGymClasses,
  enrollInClass,
  getFeaturedClasses,
  getClassesByDifficulty,
  addReview
} from '../controllers/gymController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/featured', getFeaturedClasses);
router.get('/search', searchGymClasses);
router.get('/category/:category', getClassesByCategory);
router.get('/difficulty/:level', getClassesByDifficulty);
router.get('/class/:classId', getGymClassById);

// Protected routes (require authentication)
router.post('/', protect, createGymClass);
router.get('/gym/:gymId', protect, getGymClasses);
router.put('/class/:classId', protect, updateGymClass);
router.delete('/class/:classId', protect, deleteGymClass);
router.post('/class/:classId/enroll', protect, enrollInClass);
router.post('/class/:classId/review', protect, addReview);

export default router;
