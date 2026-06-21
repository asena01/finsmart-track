import express from 'express';
import {
  getDeviceAssignments,
  assignDeviceToRoom,
  unassignDeviceFromRoom,
  getRoomDevices,
  getAssignmentStatistics
} from '../controllers/deviceAssignmentController.js';
import {
  getAutoAssignmentSuggestion,
  autoAssignDevices,
  getAvailableDevicesForRoom,
  bulkAutoAssignDevices
} from '../controllers/autoAssignmentController.js';

const router = express.Router();

/**
 * Get all device assignments for a hotel
 * GET /hotels/:hotelId/device-assignments
 */
router.get('/hotels/:hotelId/device-assignments', getDeviceAssignments);

/**
 * Get assignment statistics
 * GET /hotels/:hotelId/device-assignments/statistics
 */
router.get('/hotels/:hotelId/device-assignments/statistics', getAssignmentStatistics);

/**
 * Get devices assigned to a specific room
 * GET /hotels/:hotelId/rooms/:roomId/devices
 */
router.get('/hotels/:hotelId/rooms/:roomId/devices', getRoomDevices);

/**
 * Assign device to room
 * POST /hotels/:hotelId/device-assignments/:deviceId/assign/:roomId
 */
router.post('/hotels/:hotelId/device-assignments/:deviceId/assign/:roomId', assignDeviceToRoom);

/**
 * Unassign device from room
 * POST /hotels/:hotelId/device-assignments/:deviceId/unassign
 */
router.post('/hotels/:hotelId/device-assignments/:deviceId/unassign', unassignDeviceFromRoom);

/**
 * Get auto-assignment suggestion for a room
 * GET /hotels/:hotelId/rooms/:roomId/device-suggestion
 */
router.get('/hotels/:hotelId/rooms/:roomId/device-suggestion', getAutoAssignmentSuggestion);

/**
 * Get available devices for a room
 * GET /hotels/:hotelId/rooms/:roomId/available-devices
 */
router.get('/hotels/:hotelId/rooms/:roomId/available-devices', getAvailableDevicesForRoom);

/**
 * Auto-assign devices to a specific room
 * POST /hotels/:hotelId/rooms/:roomId/auto-assign
 */
router.post('/hotels/:hotelId/rooms/:roomId/auto-assign', autoAssignDevices);

/**
 * Bulk auto-assign devices to multiple rooms
 * POST /hotels/:hotelId/bulk-auto-assign
 */
router.post('/hotels/:hotelId/bulk-auto-assign', bulkAutoAssignDevices);

export default router;
