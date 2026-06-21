import express from 'express';
import {
  getAllDevices,
  getDeviceById,
  registerDevices,
  updateDevice,
  updateDeviceStatus,
  removeDevices
} from '../controllers/devicesController.js';
import {
  getDeviceStatus,
  getDeviceLogs,
  getDeviceShadowProperties,
  getAllDevices as getTuyaDevices
} from '../controllers/deviceController.js';
import Device from '../models/Device.js';

const router = express.Router();

// GET all devices (with optional hotel filter)
router.get('/', async (req, res) => {
  const { hotelId } = req.query;
  if (hotelId) {
    req.params = { hotelId };
    return getAllDevices(req, res);
  }

  try {
    const { status, deviceType, page = 1, limit = 10 } = req.query;
    let filter = {};
    if (status !== undefined) filter.status = status === 'true';
    if (deviceType) filter.deviceType = deviceType;

    const skip = (page - 1) * limit;
    const devices = await Device.find(filter)
      .populate('hotel', 'name')
      .limit(limit * 1)
      .skip(skip);

    const total = await Device.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      data: devices,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// POST register devices (batch)
router.post('/', registerDevices);

// POST register devices with batch endpoint
router.post('/batch', registerDevices);

// GET device by ID
router.get('/:id', getDeviceById);

// PUT update device
router.put('/:id', updateDevice);

// PUT update device status
router.put('/:id/status', updateDeviceStatus);

// POST remove devices (batch delete)
router.post('/remove', removeDevices);

export default router;
