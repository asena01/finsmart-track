import express from 'express';
import bcrypt from 'bcryptjs';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import AdminSettings from '../models/AdminSettings.js';
import Device from '../models/Device.js';
import VendorKyc from '../models/VendorKyc.js';
import VendorPerformance from '../models/VendorPerformance.js';
import * as vendorManagementController from '../controllers/vendorManagementController.js';
import * as vendorKycController from '../controllers/vendorKycController.js';
import * as vendorPerformanceController from '../controllers/vendorPerformanceController.js';
import * as settlementController from '../controllers/settlementController.js';
import * as payoutController from '../controllers/payoutController.js';
import * as roleController from '../controllers/roleController.js';
import { verifyAdmin as rbacVerifyAdmin, requirePermission } from '../middleware/rbacMiddleware.js';
import SmartLockService from '../services/smartLockService.js';
import tuyaSmartLockService from '../services/tuyaSmartLockService.js';

const router = express.Router();

const getTuyaContext = () => tuyaSmartLockService.getContext();

const inferTuyaDeviceType = (device = {}) => {
  const candidates = [
    device.category,
    device.product_name,
    device.name,
    device.product_id,
    device.uuid
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  const combined = candidates.join(' ');

  if (
    combined.includes('door sensor') ||
    combined.includes('door contact') ||
    combined.includes('doorcontact') ||
    combined.includes('contact sensor') ||
    combined.includes('contact detector') ||
    combined.includes('mcs')
  ) {
    return 'door_sensor';
  }

  if (
    combined.includes('lock') ||
    combined.includes('smart lock') ||
    combined.includes('door lock')
  ) {
    return 'smart_lock';
  }

  if (combined.includes('motion') || combined.includes('pir')) {
    return 'motion_sensor';
  }

  if (combined.includes('thermostat') || combined.includes('temperature')) {
    return 'thermostat';
  }

  if (combined.includes('camera')) {
    return 'camera';
  }

  if (combined.includes('light') || combined.includes('bulb')) {
    return 'light';
  }

  if (combined.includes('speaker') || combined.includes('audio')) {
    return 'speaker';
  }

  return 'motion_sensor';
};

const normalizeTuyaDevices = (result) => {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.list)) {
    return result.list;
  }

  if (Array.isArray(result?.devices)) {
    return result.devices;
  }

  return [];
};

const resolveTuyaOnline = (device = {}) => {
  if (typeof device.isOnline === 'boolean') return device.isOnline;
  if (typeof device.online === 'boolean') return device.online;
  return false;
};

const resolveTuyaUpdateTime = (device = {}) => {
  return device.update_time || device.updateTime || device.activeTime || null;
};

const extractTuyaIdentityCandidates = (tuyaData = {}, fallbackDeviceId = '') => {
  return Array.from(new Set([
    fallbackDeviceId,
    tuyaData.device_id,
    tuyaData.id,
    tuyaData.uuid,
    tuyaData.dev_id,
    tuyaData.uid,
    tuyaData.local_key
  ].filter(Boolean).map((value) => String(value))));
};

const findExistingAcceptedDevice = async (deviceId, tuyaData = {}) => {
  const candidates = extractTuyaIdentityCandidates(tuyaData, deviceId);
  const existingDevices = await Device.find({
    $or: [
      { deviceId: { $in: candidates } },
      { tuyaDeviceId: { $in: candidates } },
      { 'metadata.device_id': { $in: candidates } },
      { 'metadata.id': { $in: candidates } },
      { 'metadata.uuid': { $in: candidates } },
      { 'metadata.dev_id': { $in: candidates } },
      { 'metadata.uid': { $in: candidates } },
      { 'metadata.local_key': { $in: candidates } }
    ]
  }).sort({ updatedAt: -1, createdAt: -1 });

  return existingDevices[0] || null;
};

const fetchTuyaLiveDeviceMap = async () => {
  try {
    const response = await getTuyaContext().request({
      path: '/v2.0/cloud/thing/device',
      method: 'GET',
      query: { page_size: 20 }
    });

    if (!response.success) {
      return new Map();
    }

    return new Map(
      normalizeTuyaDevices(response.result).map((device) => {
        const normalizedDeviceId = device.device_id || device.id || device.uuid || device.dev_id || '';
        return [normalizedDeviceId, device];
      })
    );
  } catch (error) {
    console.error('⚠️ Failed to refresh live Tuya device map:', error.message);
    return new Map();
  }
};

// ============================================
// ADMIN AUTH & VERIFICATION MIDDLEWARE
// ============================================

// Middleware to verify admin access
const verifyAdmin = (req, res, next) => {
  // In production, verify JWT token
  const adminRole = req.headers['x-admin-role'];
  const userId = req.headers['x-user-id'];
  
  if (!adminRole || !userId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }
  
  req.adminRole = adminRole;
  req.userId = userId;
  next();
};

// ============================================
// ORGANIZATIONS ROUTES
// ============================================

// Get all organizations
router.get('/organizations', verifyAdmin, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    
    const organizations = await Organization.find()
      .populate('owner', 'name email phone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Organization.countDocuments();
    
    res.status(200).json({
      success: true,
      data: organizations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single organization
router.get('/organizations/:id', verifyAdmin, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate('staff', 'name email role');
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: organization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create organization
router.post('/organizations', verifyAdmin, async (req, res) => {
  try {
    const { name, type, owner, email, phone, address, website, description } = req.body;
    
    const organization = new Organization({
      name,
      type,
      owner,
      email,
      phone,
      address,
      website,
      description
    });
    
    await organization.save();
    console.log('✅ Organization created:', organization._id);
    
    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: organization
    });
  } catch (error) {
    console.error('❌ Error creating organization:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update organization
router.put('/organizations/:id', verifyAdmin, async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      data: organization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Verify/Approve organization
router.patch('/organizations/:id/verify', verifyAdmin, async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      {
        isVerified: true,
        status: 'active',
        verificationDate: new Date()
      },
      { new: true }
    );
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    console.log('✅ Organization verified:', organization._id);
    
    res.status(200).json({
      success: true,
      message: 'Organization verified successfully',
      data: organization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Suspend organization
router.patch('/organizations/:id/suspend', verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      {
        status: 'suspended',
        settings: {
          ...req.body.settings,
          suspensionReason: reason
        }
      },
      { new: true }
    );
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    console.log('✅ Organization suspended:', organization._id);
    
    res.status(200).json({
      success: true,
      message: 'Organization suspended successfully',
      data: organization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete organization
router.delete('/organizations/:id', verifyAdmin, async (req, res) => {
  try {
    const organization = await Organization.findByIdAndDelete(req.params.id);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    console.log('✅ Organization deleted:', organization._id);
    
    res.status(200).json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// USERS MANAGEMENT ROUTES
// ============================================

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const userType = req.query.userType;
    const skip = (page - 1) * limit;
    
    const filter = userType ? { userType } : {};
    
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single user
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user
router.put('/users/:id', verifyAdmin, async (req, res) => {
  try {
    // Don't allow password updates through this route
    const { password, ...updateData } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Suspend user
router.patch('/users/:id/suspend', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: true, suspensionReason: req.body.reason },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('✅ User suspended:', user._id);
    
    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('✅ User deleted:', user._id);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// PAYMENTS MANAGEMENT ROUTES
// ============================================

// Get all payment transactions
router.get('/payments', verifyAdmin, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;
    
    const filter = status ? { status } : {};
    
    const transactions = await PaymentTransaction.find(filter)
      .populate('organization', 'name')
      .populate('vendor', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await PaymentTransaction.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get payment details
router.get('/payments/:id', verifyAdmin, async (req, res) => {
  try {
    const transaction = await PaymentTransaction.findById(req.params.id)
      .populate('organization', 'name')
      .populate('vendor', 'name email')
      .populate('customer', 'name email');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Process payment
router.post('/payments/process', verifyAdmin, async (req, res) => {
  try {
    const {
      organization,
      vendor,
      amount,
      type,
      paymentMethod,
      referenceId,
      referenceType,
      description
    } = req.body;
    
    const platformCommission = (amount * 5) / 100; // 5% commission
    const paymentGatewayFee = (amount * 0.03) / 100 + 0.3; // 3% + $0.30
    const netAmount = amount - platformCommission - paymentGatewayFee;
    
    const transactionId = `TXN-${Date.now()}`;
    
    const transaction = new PaymentTransaction({
      transactionId,
      organization,
      vendor,
      amount,
      type,
      paymentMethod,
      referenceId,
      referenceType,
      description,
      platformCommission,
      paymentGatewayFee,
      netAmount,
      status: 'completed',
      completedDate: new Date()
    });
    
    await transaction.save();
    console.log('✅ Payment processed:', transactionId);
    
    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: transaction
    });
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Refund payment
router.post('/payments/:id/refund', verifyAdmin, async (req, res) => {
  try {
    const transaction = await PaymentTransaction.findByIdAndUpdate(
      req.params.id,
      {
        status: 'refunded',
        refundedDate: new Date()
      },
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    console.log('✅ Payment refunded:', transaction._id);
    
    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// DEVICES MANAGEMENT ROUTES
// ============================================

// Get accepted devices from database
router.get('/devices', verifyAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const { deviceType, status } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (deviceType) filter.deviceType = deviceType;
    if (status === 'active') filter.status = true;
    if (status === 'inactive') filter.status = false;

    const devices = await Device.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1, createdAt: -1 });

    const tuyaLiveMap = await fetchTuyaLiveDeviceMap();
    await Promise.all(
      devices.map(async (device) => {
        const tuyaId = device.tuyaDeviceId || device.deviceId;
        if (!tuyaId || !tuyaLiveMap.has(tuyaId)) {
          return;
        }

        const liveDevice = tuyaLiveMap.get(tuyaId);
        const liveStatus = resolveTuyaOnline(liveDevice);
        const updateTime = resolveTuyaUpdateTime(liveDevice);
        const liveLastSeen = updateTime ? new Date(Number(updateTime) * 1000) : null;

        if (device.status !== liveStatus || String(device.lastDetectionTime || '') !== String(liveLastSeen || '')) {
          device.status = liveStatus;
          if (liveLastSeen) {
            device.lastDetectionTime = liveLastSeen;
          }
          await device.save();
        }
      })
    );

    const total = await Device.countDocuments(filter);

    res.status(200).json({
      success: true,
      source: 'database',
      data: devices,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('❌ Error fetching accepted devices:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/devices/discovered', verifyAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 50);
    const { deviceType, status } = req.query;
    const tuyaPageSize = Math.min(Math.max(limit, 1), 20);
    const tuyaResponse = await getTuyaContext().request({
      path: '/v2.0/cloud/thing/device',
      method: 'GET',
      query: {
        page_size: tuyaPageSize
      }
    });

    if (!tuyaResponse.success) {
      return res.status(400).json({
        success: false,
        message: tuyaResponse.msg || 'Failed to fetch devices from Tuya'
      });
    }

    const acceptedDeviceIds = new Set(
      (await Device.find().select('deviceId tuyaDeviceId'))
        .flatMap((device) => [device.deviceId, device.tuyaDeviceId].filter(Boolean))
    );

    let discoveredDevices = normalizeTuyaDevices(tuyaResponse.result).map((device) => {
      const normalizedDeviceId = device.device_id || device.id || device.uuid || device.dev_id || '';
      return ({
      _id: normalizedDeviceId,
      deviceId: normalizedDeviceId,
      tuyaDeviceId: normalizedDeviceId,
      name: device.name,
      type: device.product_name || 'Smart Device',
      deviceType: inferTuyaDeviceType(device),
      status: resolveTuyaOnline(device) ? 'active' : 'inactive',
      ownerName: device.owner_id || 'Unassigned',
      lastActive: resolveTuyaUpdateTime(device) ? new Date(Number(resolveTuyaUpdateTime(device)) * 1000) : null,
      accepted: acceptedDeviceIds.has(normalizedDeviceId),
      tuyaData: device
    })});

    if (deviceType) {
      discoveredDevices = discoveredDevices.filter((device) => device.deviceType === deviceType);
    }

    if (status) {
      discoveredDevices = discoveredDevices.filter((device) => device.status === status);
    }

    const start = (page - 1) * limit;
    const pagedDevices = discoveredDevices.slice(start, start + limit);

    res.status(200).json({
      success: true,
      source: 'tuya',
      data: pagedDevices,
      pagination: {
        total: discoveredDevices.length,
        pages: Math.ceil(discoveredDevices.length / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('❌ Error fetching discovered devices:', error.message);
    const message = String(error?.message || '');
    res.status(message.includes('param size too much') ? 400 : 500).json({
      success: false,
      message: message || 'Failed to fetch discovered devices from Tuya'
    });
  }
});

router.post('/devices/accept', verifyAdmin, async (req, res) => {
  try {
    const { deviceId, name, deviceType, tuyaData } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const normalizedType = deviceType || inferTuyaDeviceType(tuyaData || { device_id: deviceId, name });
    const existingDevice = await findExistingAcceptedDevice(deviceId, tuyaData || {});

    if (existingDevice) {
      existingDevice.deviceId = deviceId;
      existingDevice.tuyaDeviceId = deviceId;
      existingDevice.deviceType = normalizedType;
      existingDevice.status = resolveTuyaOnline(tuyaData || {});
      existingDevice.isActive = true;
      existingDevice.tuyaProductId = tuyaData?.product_id || existingDevice.tuyaProductId;
      existingDevice.description = name || existingDevice.description;
      existingDevice.metadata = {
        ...(existingDevice.metadata || {}),
        ...(tuyaData || {}),
        source: 'tuya-accepted',
        sensorRole: normalizedType === 'door_sensor' ? 'door_sensor' : existingDevice.metadata?.sensorRole
      };
      await existingDevice.save();

      return res.status(200).json({
        success: true,
        message: 'Device accepted successfully',
        data: existingDevice
      });
    }

    const device = new Device({
      deviceId,
      tuyaDeviceId: deviceId,
      deviceType: normalizedType,
      status: resolveTuyaOnline(tuyaData || {}),
      isActive: true,
      description: name || tuyaData?.name || '',
      tuyaProductId: tuyaData?.product_id || null,
      metadata: {
        ...(tuyaData || {}),
        source: 'tuya-accepted',
        sensorRole: normalizedType === 'door_sensor' ? 'door_sensor' : undefined
      }
    });

    await device.save();

    res.status(201).json({
      success: true,
      message: 'Device accepted successfully',
      data: device
    });
  } catch (error) {
    console.error('❌ Error accepting device:', error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A device record with this Tuya identity already exists. Remove or update the stale accepted device first.'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create new device
router.post('/devices', verifyAdmin, async (req, res) => {
  try {
    const { deviceId, deviceType, hotel, roomNumber, lastDetection, status, tuyaData } = req.body;

    // Validate required fields
    if (!deviceId || !deviceType) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and Device Type are required'
      });
    }

    // Check if device ID already exists
    const existingDevice = await findExistingAcceptedDevice(deviceId, tuyaData || {});
    if (existingDevice) {
      existingDevice.deviceId = deviceId;
      existingDevice.tuyaDeviceId = tuyaData?.device_id || tuyaData?.id || tuyaData?.uuid || existingDevice.tuyaDeviceId || deviceId;
      existingDevice.deviceType = deviceType || existingDevice.deviceType;
      existingDevice.hotel = hotel || existingDevice.hotel;
      existingDevice.roomNumber = roomNumber ?? existingDevice.roomNumber;
      existingDevice.lastDetection = lastDetection || existingDevice.lastDetection;
      existingDevice.status = status !== undefined ? status : existingDevice.status;
      existingDevice.isActive = true;
      existingDevice.metadata = {
        ...(existingDevice.metadata || {}),
        ...(tuyaData || {}),
        source: (tuyaData ? 'tuya-reconciled' : existingDevice.metadata?.source)
      };
      await existingDevice.save();

      return res.status(200).json({
        success: true,
        message: 'Existing stale device record updated successfully',
        data: existingDevice
      });
    }

    const device = new Device({
      deviceId,
      deviceType,
      hotel,
      roomNumber,
      lastDetection,
      status: status !== undefined ? status : true
    });

    await device.save();
    console.log('✅ Device created:', device._id);

    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      data: device
    });
  } catch (error) {
    console.error('❌ Error creating device:', error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A device with this identifier already exists in the platform.'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/devices/:id/live-status', verifyAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const tuyaId = device.tuyaDeviceId || device.deviceId;
    if (!tuyaId) {
      return res.status(400).json({
        success: false,
        message: 'Device is not linked to Tuya'
      });
    }

    const listResponse = await getTuyaContext().request({
      path: '/v2.0/cloud/thing/device',
      method: 'GET',
      query: { page_size: 20 }
    });

    if (!listResponse.success) {
      return res.status(400).json({
        success: false,
        message: listResponse.msg || 'Failed to fetch live Tuya status'
      });
    }

    const liveDevice = normalizeTuyaDevices(listResponse.result).find((item) => {
      const normalizedDeviceId = item.device_id || item.id || item.uuid || item.dev_id || '';
      return normalizedDeviceId === tuyaId;
    });

    if (!liveDevice) {
      device.status = false;
      device.isActive = false;
      device.metadata = {
        ...(device.metadata || {}),
        staleTuyaReference: true,
        staleTuyaCheckedAt: new Date().toISOString()
      };
      await device.save();

      return res.status(200).json({
        success: true,
        message: 'Device is no longer present in the current Tuya device list. It has been marked as stale.',
        data: {
          deviceId: device._id,
          tuyaDeviceId: tuyaId,
          online: false,
          stale: true,
          lastDetectionTime: device.lastDetectionTime || null,
          tuyaDevice: null
        }
      });
    }

    const liveStatus = resolveTuyaOnline(liveDevice);
    const updateTime = resolveTuyaUpdateTime(liveDevice);
    const liveLastSeen = updateTime ? new Date(Number(updateTime) * 1000) : null;

    device.status = liveStatus;
    if (liveLastSeen) {
      device.lastDetectionTime = liveLastSeen;
    }
    await device.save();

    return res.status(200).json({
      success: true,
      message: 'Live device status retrieved successfully',
      data: {
        deviceId: device._id,
        tuyaDeviceId: tuyaId,
        online: liveStatus,
        lastDetectionTime: liveLastSeen,
        tuyaDevice: liveDevice
      }
    });
  } catch (error) {
    console.error('❌ Error fetching live device status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch live device status'
    });
  }
});

// Update device status
router.patch('/devices/:id/status', verifyAdmin, async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Device status updated',
      data: device
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete device
router.delete('/devices/:id', verifyAdmin, async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    
    console.log('✅ Device deleted:', device._id);
    
    res.status(200).json({
      success: true,
      message: 'Device deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ANALYTICS & DASHBOARD STATS
// ============================================

// Get dashboard statistics
router.get('/analytics/stats', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const totalUsers = await User.countDocuments();
    const totalVendors = await User.countDocuments({ userType: 'vendor' });
    const totalCustomers = await User.countDocuments({ userType: 'customer' });
    const totalOrganizations = await Organization.countDocuments();
    const totalTransactions = await PaymentTransaction.countDocuments(dateFilter);
    
    const totalRevenue = await PaymentTransaction.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const platformCommission = await PaymentTransaction.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$platformCommission' } } }
    ]);
    
    const activeOrganizations = await Organization.countDocuments({ status: 'active' });
    const pendingOrganizations = await Organization.countDocuments({ status: 'pending-verification' });
    
    // Get vendor statuses
    const activeVendors = await User.countDocuments({ userType: 'vendor', status: 'active' });
    const pendingVendors = await User.countDocuments({ userType: 'vendor', status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          vendors: totalVendors,
          customers: totalCustomers
        },
        vendors: {
          total: totalVendors,
          active: activeVendors,
          pending: pendingVendors
        },
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          pending: pendingOrganizations
        },
        payments: {
          totalTransactions,
          totalRevenue: totalRevenue[0]?.total || 0,
          platformCommission: platformCommission[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get revenue by organization type
router.get('/analytics/revenue-by-type', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const revenueByType = await PaymentTransaction.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organization',
          foreignField: '_id',
          as: 'org'
        }
      },
      { $unwind: '$org' },
      {
        $group: {
          _id: '$org.type',
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: revenueByType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// VENDOR MANAGEMENT ROUTES
// ============================================

// Get all vendors with filtering
router.get('/vendors', verifyAdmin, vendorManagementController.getVendors);

// Get vendor by ID
router.get('/vendors/:vendorId', verifyAdmin, vendorManagementController.getVendorById);

// Create vendor
router.post('/vendors', verifyAdmin, vendorManagementController.createVendor);

// Update vendor
router.put('/vendors/:vendorId', verifyAdmin, vendorManagementController.updateVendor);

// Delete vendor
router.delete('/vendors/:vendorId', verifyAdmin, vendorManagementController.deleteVendor);

// Approve vendor
router.patch('/vendors/:vendorId/approve', verifyAdmin, vendorManagementController.approveVendor);

// Reject vendor
router.patch('/vendors/:vendorId/reject', verifyAdmin, vendorManagementController.rejectVendor);

// Suspend vendor
router.patch('/vendors/:vendorId/suspend', verifyAdmin, vendorManagementController.suspendVendor);

// Block vendor
router.patch('/vendors/:vendorId/block', verifyAdmin, vendorManagementController.blockVendor);

// Get vendor statistics
router.get('/vendors-stats', verifyAdmin, vendorManagementController.getVendorStats);

// ============================================
// VENDOR KYC ROUTES
// ============================================

// Get vendor KYC
router.get('/vendors/:vendorId/kyc', verifyAdmin, vendorKycController.getVendorKyc);

// Create or update KYC
router.put('/vendors/:vendorId/kyc', verifyAdmin, vendorKycController.createOrUpdateKyc);

// Approve KYC
router.patch('/vendors/:vendorId/kyc/approve', verifyAdmin, vendorKycController.approveKyc);

// Reject KYC
router.patch('/vendors/:vendorId/kyc/reject', verifyAdmin, vendorKycController.rejectKyc);

// Request KYC resubmission
router.patch('/vendors/:vendorId/kyc/resubmit', verifyAdmin, vendorKycController.requestResubmission);

// Update risk assessment
router.put('/vendors/:vendorId/kyc/risk', verifyAdmin, vendorKycController.updateRiskAssessment);

// Get pending KYC
router.get('/kyc/pending', verifyAdmin, vendorKycController.getPendingKyc);

// Get high-risk vendors
router.get('/kyc/high-risk', verifyAdmin, vendorKycController.getHighRiskVendors);

// ============================================
// VENDOR PERFORMANCE ROUTES
// ============================================

// Get vendor performance
router.get('/vendors/:vendorId/performance', verifyAdmin, vendorPerformanceController.getVendorPerformance);

// Update performance metrics
router.put('/vendors/:vendorId/performance', verifyAdmin, vendorPerformanceController.updatePerformanceMetrics);

// Record review
router.post('/vendors/:vendorId/performance/review', verifyAdmin, vendorPerformanceController.recordReview);

// Record booking
router.post('/vendors/:vendorId/performance/booking', verifyAdmin, vendorPerformanceController.recordBooking);

// Add monthly performance
router.post('/vendors/:vendorId/performance/monthly', verifyAdmin, vendorPerformanceController.addMonthlyPerformance);

// Get top performers
router.get('/performance/top-performers', verifyAdmin, vendorPerformanceController.getTopPerformers);

// Get vendors needing improvement
router.get('/performance/needs-improvement', verifyAdmin, vendorPerformanceController.getVendorsNeedingImprovement);

// ============================================
// SETTINGS ROUTES
// ============================================

// Get admin settings
router.get('/settings', verifyAdmin, async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();

    if (!settings) {
      settings = new AdminSettings();
      await settings.save();
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update admin settings
router.put('/settings', verifyAdmin, async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();

    if (!settings) {
      settings = new AdminSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }

    await settings.save();
    console.log('✅ Admin settings updated');

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// SETTLEMENT MANAGEMENT ROUTES
// ============================================

router.get('/settlements', verifyAdmin, settlementController.getSettlements);
router.get('/settlements/:settlementId', verifyAdmin, settlementController.getSettlementById);
router.post('/settlements', verifyAdmin, settlementController.createSettlement);
router.put('/settlements/:settlementId', verifyAdmin, settlementController.updateSettlement);
router.patch('/settlements/:settlementId/approve', verifyAdmin, settlementController.approveSettlement);
router.patch('/settlements/:settlementId/reject', verifyAdmin, settlementController.rejectSettlement);
router.delete('/settlements/:settlementId', verifyAdmin, settlementController.deleteSettlement);
router.get('/settlements/stats', verifyAdmin, settlementController.getSettlementStats);

// ============================================
// PAYOUT MANAGEMENT ROUTES
// ============================================

router.get('/payouts', verifyAdmin, payoutController.getPayouts);
router.get('/payouts/:payoutId', verifyAdmin, payoutController.getPayoutById);
router.post('/payouts', verifyAdmin, payoutController.createPayout);
router.put('/payouts/:payoutId', verifyAdmin, payoutController.updatePayout);
router.patch('/payouts/:payoutId/approve', verifyAdmin, payoutController.approvePayout);
router.patch('/payouts/:payoutId/process', verifyAdmin, payoutController.processPayout);
router.patch('/payouts/:payoutId/complete', verifyAdmin, payoutController.completePayout);
router.patch('/payouts/:payoutId/retry', verifyAdmin, payoutController.retryPayout);
router.patch('/payouts/:payoutId/cancel', verifyAdmin, payoutController.cancelPayout);

// Payout Schedule
router.get('/payout-schedules/:vendorId', verifyAdmin, payoutController.getPayoutSchedule);
router.put('/payout-schedules/:vendorId', verifyAdmin, payoutController.updatePayoutSchedule);

// ============================================
// ROLE & PERMISSION MANAGEMENT ROUTES
// ============================================

// Permissions
router.get('/permissions', verifyAdmin, roleController.getPermissions);
router.post('/permissions', verifyAdmin, roleController.createPermission);
router.put('/permissions/:permissionId', verifyAdmin, roleController.updatePermission);

// Roles
router.get('/roles', verifyAdmin, roleController.getRoles);
router.get('/roles/:roleId', verifyAdmin, roleController.getRoleById);
router.post('/roles', verifyAdmin, roleController.createRole);
router.put('/roles/:roleId', verifyAdmin, roleController.updateRole);
router.delete('/roles/:roleId', verifyAdmin, roleController.deleteRole);

// Role Permissions
router.post('/roles/:roleId/permissions/:permissionId', verifyAdmin, roleController.addPermissionToRole);
router.delete('/roles/:roleId/permissions/:permissionId', verifyAdmin, roleController.removePermissionFromRole);

// User Permissions
router.get('/users/:userId/permissions', verifyAdmin, roleController.getUserPermissions);
router.post('/check-permission', verifyAdmin, roleController.checkPermission);

// ============================================
// SEED DATA ENDPOINT (Development Only)
// ============================================

router.post('/seed-test-data', verifyAdmin, async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Seeding is not allowed in production'
      });
    }

    // Vendor data to seed
    const vendorData = [
      // Hotels
      {
        name: 'Luxury Grand Hotel',
        email: 'luxury@grandhospitality.com',
        password: 'password123',
        phone: '+234-801-234-5001',
        userType: 'vendor',
        vendorType: 'hotel',
        businessName: 'Luxury Grand Hotel',
        businessDescription: 'A premium 5-star hotel with world-class amenities',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'Comfort Inn Resort',
        email: 'info@comfortinn.com',
        password: 'password123',
        phone: '+234-802-234-5002',
        userType: 'vendor',
        vendorType: 'hotel',
        businessName: 'Comfort Inn Resort',
        businessDescription: 'Affordable 3-star hotel with family-friendly services',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'Beach Paradise Hotel',
        email: 'beach@paradisehotel.com',
        password: 'password123',
        phone: '+234-803-234-5003',
        userType: 'vendor',
        vendorType: 'hotel',
        businessName: 'Beach Paradise Hotel',
        businessDescription: 'Beachfront resort with water sports facilities',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      // Restaurants
      {
        name: 'Fine Dining Restaurant',
        email: 'fine@diningrestaurant.com',
        password: 'password123',
        phone: '+234-804-234-5004',
        userType: 'vendor',
        vendorType: 'restaurant',
        businessName: 'Fine Dining Restaurant',
        businessDescription: 'Upscale restaurant serving international cuisine',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'Taste of Africa',
        email: 'taste@africarestaurant.com',
        password: 'password123',
        phone: '+234-805-234-5005',
        userType: 'vendor',
        vendorType: 'restaurant',
        businessName: 'Taste of Africa',
        businessDescription: 'Traditional African dishes with modern twist',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'Quick Bites Cafe',
        email: 'bites@quickcafe.com',
        password: 'password123',
        phone: '+234-806-234-5006',
        userType: 'vendor',
        vendorType: 'restaurant',
        businessName: 'Quick Bites Cafe',
        businessDescription: 'Fast casual restaurant with healthy options',
        isVerified: false,
        status: 'pending',
        kycStatus: 'pending'
      },
      // Retail Stores
      {
        name: 'Fashion Forward Boutique',
        email: 'fashion@forwardboutique.com',
        password: 'password123',
        phone: '+234-807-234-5007',
        userType: 'vendor',
        vendorType: 'retail',
        businessName: 'Fashion Forward Boutique',
        businessDescription: 'Trendy clothing and accessories store',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'Electronics Hub',
        email: 'tech@electronicshub.com',
        password: 'password123',
        phone: '+234-808-234-5008',
        userType: 'vendor',
        vendorType: 'retail',
        businessName: 'Electronics Hub',
        businessDescription: 'Latest gadgets and electronic devices',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      // Services
      {
        name: 'ProTech Solutions',
        email: 'tech@protech-solutions.com',
        password: 'password123',
        phone: '+234-809-234-5009',
        userType: 'vendor',
        vendorType: 'service',
        businessName: 'ProTech Solutions',
        businessDescription: 'IT and software development services',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'Beauty & Wellness Spa',
        email: 'beauty@wellnessspa.com',
        password: 'password123',
        phone: '+234-810-234-5010',
        userType: 'vendor',
        vendorType: 'service',
        businessName: 'Beauty & Wellness Spa',
        businessDescription: 'Full-service spa with beauty treatments',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      // Tours
      {
        name: 'Safari Adventures',
        email: 'safari@adventures.com',
        password: 'password123',
        phone: '+234-811-234-5011',
        userType: 'vendor',
        vendorType: 'tour-operator',
        businessName: 'Safari Adventures',
        businessDescription: 'Exciting wildlife safari tours',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'City Tours Guide',
        email: 'city@toursguide.com',
        password: 'password123',
        phone: '+234-812-234-5012',
        userType: 'vendor',
        vendorType: 'tour-operator',
        businessName: 'City Tours Guide',
        businessDescription: 'Guided city sightseeing tours',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      // Delivery
      {
        name: 'Swift Delivery Co',
        email: 'swift@deliveryco.com',
        password: 'password123',
        phone: '+234-813-234-5013',
        userType: 'vendor',
        vendorType: 'delivery',
        businessName: 'Swift Delivery Co',
        businessDescription: 'Fast and reliable delivery service',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      },
      {
        name: 'Express Logistics',
        email: 'express@logistics.com',
        password: 'password123',
        phone: '+234-814-234-5014',
        userType: 'vendor',
        vendorType: 'delivery',
        businessName: 'Express Logistics',
        businessDescription: 'Professional logistics and courier services',
        isVerified: true,
        status: 'active',
        kycStatus: 'approved'
      }
    ];

    // Delete existing vendors first
    const deleteResult = await User.deleteMany({ userType: 'vendor' });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing vendors`);

    // Create vendors
    const createdVendors = [];
    for (const vendorInfo of vendorData) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(vendorInfo.password, salt);

      const vendor = new User({
        ...vendorInfo,
        password: hashedPassword
      });

      await vendor.save();
      createdVendors.push(vendor);
    }

    console.log(`✅ Created ${createdVendors.length} test vendors`);

    // Create performance records
    let performanceCount = 0;
    for (const vendor of createdVendors) {
      // Check if performance record already exists
      let performance = await VendorPerformance.findOne({ vendor: vendor._id });

      if (!performance) {
        performance = new VendorPerformance({
          vendor: vendor._id,
          revenue: {
            thisMonth: Math.floor(Math.random() * 100000) + 10000,
            lastMonth: Math.floor(Math.random() * 100000) + 5000,
            total: Math.floor(Math.random() * 500000) + 50000
          },
          rating: {
            average: parseFloat((Math.random() * 5 * 0.7 + 2.5).toFixed(2)),
            count: Math.floor(Math.random() * 500)
          },
          bookings: {
            total: Math.floor(Math.random() * 1000),
            completed: Math.floor(Math.random() * 800),
            pending: Math.floor(Math.random() * 50)
          },
          reviews: {
            total: Math.floor(Math.random() * 200),
            positive: Math.floor(Math.random() * 150),
            negative: Math.floor(Math.random() * 20)
          }
        });
        await performance.save();
        performanceCount++;
      }
    }

    console.log(`✅ Created ${performanceCount} performance records`);

    res.status(200).json({
      success: true,
      message: 'Test data seeded successfully',
      data: {
        vendorsCreated: createdVendors.length,
        performanceRecords: performanceCount,
        vendors: createdVendors.map(v => ({
          id: v._id,
          name: v.businessName,
          type: v.vendorType,
          email: v.email
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding test data',
      error: error.message
    });
  }
});

export default router;
