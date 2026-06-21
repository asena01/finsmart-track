import express from 'express';
import {
  getAllTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour,
  getToursByDestination,
  getToursByDifficulty,
  getFeaturedTours,
  updateTourRating,
  updateTourParticipants,
  searchTours,
  getAgencyInfo,
  getBookings,
  getTourPackages
} from '../controllers/toursController.js';
import {
  getTourGuides,
  getTourGuideById,
  createTourGuide,
  updateTourGuide,
  deleteTourGuide,
  updateGuideStatus,
  updateGuideRating,
  incrementToursCompleted
} from '../controllers/tourGuidesController.js';

const router = express.Router();

// Public endpoints - get tours
router.get('/featured', getFeaturedTours);
router.get('/search', searchTours);
router.get('/destination/:destination', getToursByDestination);
router.get('/difficulty/:difficulty', getToursByDifficulty);

// Agency and dashboard endpoints
router.get('/agency/:agencyId', getAgencyInfo);
router.get('/bookings', getBookings);
router.get('/packages', getTourPackages);

// Tour guides endpoints
router.get('/tour-guides', getTourGuides);
router.get('/tour-guides/:id', getTourGuideById);
router.post('/tour-guides', createTourGuide);
router.put('/tour-guides/:id', updateTourGuide);
router.put('/tour-guides/:id/status', updateGuideStatus);
router.put('/tour-guides/:id/rating', updateGuideRating);
router.put('/tour-guides/:id/tours-completed', incrementToursCompleted);
router.delete('/tour-guides/:id', deleteTourGuide);

// Single tour endpoints
router.get('/:id', getTourById);

// Tour management endpoints
router.post('/', createTour);
router.put('/:id', updateTour);
router.delete('/:id', deleteTour);

// Update tour attributes
router.put('/:id/rating', updateTourRating);
router.put('/:id/participants', updateTourParticipants);

// General tours list (must be last to avoid conflicts)
router.get('/', getAllTours);

export default router;
