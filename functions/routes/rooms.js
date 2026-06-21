import express from 'express';
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus
} from '../controllers/roomsController.js';

const router = express.Router({ mergeParams: true });

// GET all rooms
router.get('/', getAllRooms);

// GET room by ID
router.get('/:id', getRoomById);

// POST create room
router.post('/', createRoom);

// PUT update room
router.put('/:id', updateRoom);

// PUT update room status
router.put('/:id/status', updateRoomStatus);

// DELETE room
router.delete('/:id', deleteRoom);

export default router;
