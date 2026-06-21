import express from 'express';
import {
  getAllFoodOrders,
  getFoodOrderById,
  createFoodOrder,
  updateFoodOrder,
  updateFoodOrderStatus,
  deleteFoodOrder
} from '../controllers/foodOrdersController.js';

const router = express.Router({ mergeParams: true });

// GET all food orders
router.get('/', getAllFoodOrders);

// GET food order by ID
router.get('/:id', getFoodOrderById);

// POST create food order
router.post('/', createFoodOrder);

// PUT update food order
router.put('/:id', updateFoodOrder);

// PUT update food order status
router.put('/:id/status', updateFoodOrderStatus);

// DELETE food order
router.delete('/:id', deleteFoodOrder);

export default router;
