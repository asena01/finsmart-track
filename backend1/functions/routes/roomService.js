import express from 'express';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  toggleAvailability
} from '../controllers/roomServiceController.js';

const router = express.Router({ mergeParams: true });

// GET all room service menu items
router.get('/', getAllItems);

// GET room service menu item by ID
router.get('/:id', getItemById);

// POST create room service menu item
router.post('/', createItem);

// PUT update room service menu item
router.put('/:id', updateItem);

// PUT toggle item availability
router.put('/:id/toggle-availability', toggleAvailability);

// DELETE room service menu item
router.delete('/:id', deleteItem);

export default router;
