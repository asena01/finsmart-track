import express from 'express';
import {
  allocateSmartAccessGrantPassword,
  assignStaffSmartAccess,
  deleteRoomTuyaPassword,
  getSmartAccessGrants,
  getRoomTuyaPasswords,
  inspectSmartAccessGrantAllocation,
  refreshSmartAccessGrantStatus,
  syncRoomLockPasswords,
  revokeSmartAccessGrant
} from '../controllers/smartAccessController.js';

const router = express.Router({ mergeParams: true });

router.get('/hotels/:hotelId/smart-access/grants', getSmartAccessGrants);
router.get('/hotels/:hotelId/smart-access/rooms/:roomId/tuya-passwords', getRoomTuyaPasswords);
router.get('/hotels/:hotelId/smart-access/:grantId/allocation-inspect', inspectSmartAccessGrantAllocation);
router.post('/hotels/:hotelId/smart-access/:grantId/allocate-password', allocateSmartAccessGrantPassword);
router.post('/hotels/:hotelId/smart-access/staff', assignStaffSmartAccess);
router.post('/hotels/:hotelId/smart-access/rooms/:roomId/tuya-passwords/:passwordId/delete', deleteRoomTuyaPassword);
router.post('/hotels/:hotelId/smart-access/rooms/:roomId/sync-passwords', syncRoomLockPasswords);
router.post('/hotels/:hotelId/smart-access/:grantId/status-refresh', refreshSmartAccessGrantStatus);
router.post('/hotels/:hotelId/smart-access/:grantId/revoke', revokeSmartAccessGrant);

export default router;
