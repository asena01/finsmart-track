import express from 'express';
import {
  assignRoomTask,
  createRoomTask,
  getAllRoomTasks,
  getMyRoomTasks,
  upsertSourceLinkedTask,
  updateRoomTaskStatus
} from '../controllers/roomTaskController.js';

const router = express.Router({ mergeParams: true });

router.get('/', getAllRoomTasks);
router.post('/', createRoomTask);
router.post('/source-link', upsertSourceLinkedTask);
router.get('/my/:staffId', getMyRoomTasks);
router.put('/:id/assign', assignRoomTask);
router.put('/:id/status', updateRoomTaskStatus);

export default router;
