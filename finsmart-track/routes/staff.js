import express from 'express';
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  getStaffActivitySummary,
  generateStaffSchedule,
  getStaffSchedule,
  updateStaffScheduleEntry,
  deleteStaffScheduleEntry,
  deleteStaffScheduleWeek,
  getStaffScheduleForStaff,
  respondToScheduleEntry,
  requestScheduleSwap
} from '../controllers/staffController.js';

const router = express.Router({ mergeParams: true });

// GET all staff
router.get('/', getAllStaff);

// GET generated weekly schedule
router.get('/schedule-generator', getStaffSchedule);

// GET schedule for a specific staff member
router.get('/:id/my-schedule', getStaffScheduleForStaff);

// GET staff activity summary
router.get('/:id/activity-summary', getStaffActivitySummary);

// GET staff by ID
router.get('/:id', getStaffById);

// POST create staff
router.post('/', createStaff);

// POST generate weekly schedule
router.post('/schedule-generator', generateStaffSchedule);

// PUT update a generated schedule entry
router.put('/schedule-generator/:scheduleId/entries/:entryId', updateStaffScheduleEntry);

// DELETE a generated schedule entry
router.delete('/schedule-generator/:scheduleId/entries/:entryId', deleteStaffScheduleEntry);

// DELETE a generated schedule week
router.delete('/schedule-generator/:scheduleId', deleteStaffScheduleWeek);

// POST accept/reject schedule entry
router.post('/:id/schedule-response', respondToScheduleEntry);

// POST request shift swap with colleague
router.post('/:id/request-swap', requestScheduleSwap);

// POST reset staff temporary password
router.post('/:id/reset-password', resetStaffPassword);

// PUT update staff
router.put('/:id', updateStaff);

// DELETE staff
router.delete('/:id', deleteStaff);

export default router;
