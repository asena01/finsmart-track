import express from 'express';
import {
  getAllActivityLogs,
  getActivityStats,
  createActivityLog,
  getActivityLogById,
  deleteActivityLog
} from '../controllers/staffLogsController.js';

const router = express.Router({ mergeParams: true });

// Get all activity logs
router.get('/', getAllActivityLogs);

// Get activity statistics
router.get('/stats', getActivityStats);

// Create new activity log
router.post('/', createActivityLog);

// Get activity log by ID
router.get('/:id', getActivityLogById);

// Delete activity log
router.delete('/:id', deleteActivityLog);

export default router;
