import Device from '../models/Device.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

const TUYA_ACCESS_KEY = process.env.TUYA_ACCESS_KEY || "uacrm8an77hjqghy7qug";
const TUYA_SECRET_KEY = process.env.TUYA_SECRET_KEY || "59c473f01d2f4ca3ba7cb77ccd258661";
const TUYA_REGION = process.env.TUYA_REGION || "https://openapi.tuyaeu.com";

const tuyaContext = new TuyaContext({
  baseUrl: TUYA_REGION,
  accessKey: TUYA_ACCESS_KEY,
  secretKey: TUYA_SECRET_KEY,
});

const isDoorSensorDevice = (device) => {
  if (!device) return false;
  return device.deviceType === 'door_sensor' || device.deviceType === 'motion_sensor' || (
    device.deviceType === 'motion_sensor' &&
    (device.metadata?.sensorRole === 'door_sensor' || device.metadata?.usage === 'door_monitoring')
  );
};

const deriveAccessMode = (room) => {
  const hasSmartLock = !!room.smartLockDevice;
  const hasDoorSensor = !!room.doorSensorDevice;

  if (hasSmartLock && hasDoorSensor) return 'hybrid';
  if (hasSmartLock) return 'smart_lock';
  if (hasDoorSensor) return 'door_sensor';
  return 'none';
};

const applyRoomSecurityState = async (room, device, action = 'assign') => {
  if (!room || !device) return;

  if (device.deviceType === 'smart_lock') {
    room.smartLockDevice = action === 'assign' ? device._id : null;
  }

  if (isDoorSensorDevice(device)) {
    room.doorSensorDevice = action === 'assign' ? device._id : null;
  }

  room.accessMode = deriveAccessMode(room);
  room.contactlessReady = ['smart_lock', 'hybrid'].includes(room.accessMode);
  room.monitoringEnabled = ['door_sensor', 'hybrid'].includes(room.accessMode);
  await room.save();
};

const normalizeTuyaDevices = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.list)) return result.list;
  if (Array.isArray(result?.devices)) return result.devices;
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

const fetchTuyaLiveDeviceMap = async () => {
  try {
    const response = await tuyaContext.request({
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
    console.error('⚠️ Failed to refresh hotel device statuses from Tuya:', error.message);
    return new Map();
  }
};

/**
 * Get all devices with their room assignments
 * GET /hotels/:hotelId/device-assignments
 */
export const getDeviceAssignments = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // Devices visible to this hotel:
    // - devices already assigned to this hotel
    // - accepted devices not yet assigned to any hotel/room
    const devices = await Device.find({
      $or: [
        { hotel: hotelId },
        { hotel: null, room: null }
      ]
    })
      .populate('room', 'roomNumber roomType floor accessMode contactlessReady monitoringEnabled smartLockDevice doorSensorDevice')
      .sort({ roomNumber: 1, deviceType: 1 });

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

    // Get all rooms for this hotel
    const rooms = await Room.find({ hotel: hotelId })
      .populate('smartLockDevice', 'deviceId deviceType status')
      .populate('doorSensorDevice', 'deviceId deviceType status')
      .select('roomNumber roomType floor capacity status accessMode contactlessReady monitoringEnabled smartLockDevice doorSensorDevice')
      .sort({ roomNumber: 1 });

    // Build assignment map
    const assignmentMap = {};
    rooms.forEach(room => {
      assignmentMap[room._id] = {
        room,
        devices: devices.filter(d => d.room && d.room._id?.toString() === room._id?.toString())
      };
    });

    // Get unassigned devices
    const unassignedDevices = devices.filter(d => !d.room);

    return res.status(200).json({
      status: 'success',
      data: {
        assignmentMap,
        unassignedDevices,
        summary: {
          totalDevices: devices.length,
          assignedDevices: devices.filter(d => d.room).length,
          unassignedDevices: unassignedDevices.length,
          activeDevices: devices.filter(d => d.status === true || d.status === 'true').length,
          inactiveDevices: devices.filter(d => d.status === false || d.status === 'false' || !d.status).length,
          totalRooms: rooms.length,
          contactlessReadyRooms: rooms.filter(r => r.contactlessReady === true).length,
          monitoredOnlyRooms: rooms.filter(r => r.accessMode === 'door_sensor').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching device assignments:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch device assignments'
    });
  }
};

/**
 * Assign a device to a room
 * POST /hotels/:hotelId/device-assignments/:deviceId/assign/:roomId
 */
export const assignDeviceToRoom = async (req, res) => {
  try {
    const { hotelId, deviceId, roomId } = req.params;

    // Verify device exists and is either already owned by this hotel or globally unassigned
    const device = await Device.findById(deviceId);
    const deviceBelongsToAnotherHotel =
      device?.hotel && device.hotel.toString() !== hotelId;

    if (!device || deviceBelongsToAnotherHotel) {
      return res.status(404).json({
        status: 'failed',
        message: 'Device not found or already belongs to another hotel'
      });
    }

    // Verify room exists and belongs to this hotel
    const room = await Room.findById(roomId);
    if (!room || room.hotel?.toString() !== hotelId) {
      return res.status(404).json({
        status: 'failed',
        message: 'Room not found or does not belong to this hotel'
      });
    }

    // Clear the previous room's security profile when moving access hardware.
    let previousRoom = null;
    if (device.room && device.room.toString() !== roomId) {
      console.warn(`Device ${deviceId} reassigned from room ${device.room} to room ${roomId}`);
      previousRoom = await Room.findById(device.room);
    }

    // Update device assignment
    device.hotel = hotelId;
    device.room = roomId;
    device.roomNumber = parseInt(room.roomNumber) || null;
    await device.save();
    if (previousRoom) {
      await applyRoomSecurityState(previousRoom, device, 'unassign');
    }
    await applyRoomSecurityState(room, device, 'assign');
    await room.populate('smartLockDevice', 'deviceId deviceType status');
    await room.populate('doorSensorDevice', 'deviceId deviceType status');

    return res.status(200).json({
      status: 'success',
      message: `Device assigned to Room ${room.roomNumber}`,
      data: {
        deviceId: device._id,
        deviceName: device.deviceId,
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomSecurity: {
          accessMode: room.accessMode,
          contactlessReady: room.contactlessReady,
          monitoringEnabled: room.monitoringEnabled,
          smartLockDevice: room.smartLockDevice,
          doorSensorDevice: room.doorSensorDevice
        },
        assignment: {
          assignedAt: device.updatedAt,
          deviceType: device.deviceType,
          status: device.status
        }
      }
    });
  } catch (error) {
    console.error('Error assigning device:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to assign device'
    });
  }
};

/**
 * Unassign a device from a room
 * POST /hotels/:hotelId/device-assignments/:deviceId/unassign
 */
export const unassignDeviceFromRoom = async (req, res) => {
  try {
    const { hotelId, deviceId } = req.params;

    const device = await Device.findById(deviceId);
    if (!device || device.hotel?.toString() !== hotelId) {
      return res.status(404).json({
        status: 'failed',
        message: 'Device not found'
      });
    }

    const previousRoomId = device.room;
    const previousRoom = previousRoomId ? await Room.findById(previousRoomId) : null;
    device.room = null;
    device.roomNumber = null;
    await device.save();
    if (previousRoom) {
      await applyRoomSecurityState(previousRoom, device, 'unassign');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Device unassigned from room',
      data: {
        deviceId: device._id,
        deviceName: device.deviceId,
        previousRoomId,
        unassignedAt: device.updatedAt
      }
    });
  } catch (error) {
    console.error('Error unassigning device:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to unassign device'
    });
  }
};

/**
 * Get devices for a specific room
 * GET /hotels/:hotelId/rooms/:roomId/devices
 */
export const getRoomDevices = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room || room.hotel?.toString() !== hotelId) {
      return res.status(404).json({
        status: 'failed',
        message: 'Room not found'
      });
    }

    const devices = await Device.find({ room: roomId, hotel: hotelId });

    return res.status(200).json({
      status: 'success',
      data: {
        room: {
          _id: room._id,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          floor: room.floor,
          capacity: room.capacity
        },
        devices,
        summary: {
          totalDevices: devices.length,
          activeDevices: devices.filter(d => d.status).length,
          inactiveDevices: devices.filter(d => !d.status).length,
          deviceTypes: [...new Set(devices.map(d => d.deviceType))]
        },
        security: {
          accessMode: room.accessMode || 'none',
          contactlessReady: room.contactlessReady === true,
          monitoringEnabled: room.monitoringEnabled === true,
          smartLockDevice: room.smartLockDevice || null,
          doorSensorDevice: room.doorSensorDevice || null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching room devices:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch room devices'
    });
  }
};

/**
 * Get statistics on device assignments
 * GET /hotels/:hotelId/device-assignments/statistics
 */
export const getAssignmentStatistics = async (req, res) => {
  try {
    const { hotelId } = req.params;

    const devices = await Device.find({ hotel: hotelId });
    const rooms = await Room.find({ hotel: hotelId });

    const assigned = devices.filter(d => d.room);
    const unassigned = devices.filter(d => !d.room);

    // Group by device type
    const deviceTypeStats = {};
    devices.forEach(device => {
      if (!deviceTypeStats[device.deviceType]) {
        deviceTypeStats[device.deviceType] = {
          total: 0,
          assigned: 0,
          unassigned: 0
        };
      }
      deviceTypeStats[device.deviceType].total++;
      if (device.room) {
        deviceTypeStats[device.deviceType].assigned++;
      } else {
        deviceTypeStats[device.deviceType].unassigned++;
      }
    });

    // Get rooms without devices
    const roomsWithoutDevices = rooms.filter(room => {
      return !devices.some(d => d.room?.toString() === room._id?.toString());
    });

    return res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalDevices: devices.length,
          assignedDevices: assigned.length,
          unassignedDevices: unassigned.length,
          assignmentRate: devices.length > 0 ? Math.round((assigned.length / devices.length) * 100) : 0,
          totalRooms: rooms.length,
          roomsWithDevices: rooms.length - roomsWithoutDevices.length,
          roomsWithoutDevices: roomsWithoutDevices.length
        },
        deviceTypeStats,
        roomsWithoutDevices: roomsWithoutDevices.map(r => ({
          _id: r._id,
          roomNumber: r.roomNumber,
          roomType: r.roomType,
          floor: r.floor
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching assignment statistics:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch assignment statistics'
    });
  }
};

export default {
  getDeviceAssignments,
  assignDeviceToRoom,
  unassignDeviceFromRoom,
  getRoomDevices,
  getAssignmentStatistics
};
