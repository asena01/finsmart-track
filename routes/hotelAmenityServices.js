import express from 'express';
import {
  getAllHotelAmenityServices,
  getHotelAmenityServiceById,
  createHotelAmenityService,
  updateHotelAmenityService,
  deleteHotelAmenityService
} from '../controllers/hotelAmenityServicesController.js';

const router = express.Router({ mergeParams: true });

router.get('/', getAllHotelAmenityServices);
router.get('/:id', getHotelAmenityServiceById);
router.post('/', createHotelAmenityService);
router.put('/:id', updateHotelAmenityService);
router.delete('/:id', deleteHotelAmenityService);

export default router;
