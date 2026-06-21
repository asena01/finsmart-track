import express from 'express';
import {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  updateMaintenanceStatus,
  deleteMaintenance
} from '../controllers/maintenanceController.js';

const router = express.Router({ mergeParams: true });

// GET all maintenance requests
router.get('/', getAllMaintenance);

// GET maintenance by ID
router.get('/:id', getMaintenanceById);

// POST create maintenance request
router.post('/', createMaintenance);

// PUT update maintenance
router.put('/:id', updateMaintenance);

// PUT update maintenance status
router.put('/:id/status', updateMaintenanceStatus);

// DELETE maintenance
router.delete('/:id', deleteMaintenance);

export default router;
