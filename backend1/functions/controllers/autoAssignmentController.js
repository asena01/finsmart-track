import Device from '../models/Device.js';
import Room from '../models/Room.js';
import {
  generateAutoAssignmentSuggestion,
  getCompatibleDevices,
  canAddDevice
} from '../config/deviceCompatibility.js';

/**
 * Get auto-assignment suggestion for a room
 * GET /hotels/:hotelId/rooms/:roomId/device-suggestion
 */
export const getAutoAssignmentSuggestion = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room || room.hotel?.toString() !== hotelId) {
      return res.status(404).json({
        status: 'failed',
        message: 'Room not found'
      });
    }

    const suggestion = generateAutoAssignmentSuggestion(room.roomType);
    const currentDevices = await Device.find({ room: roomId, hotel: hotelId });
    const assignedTypes = currentDevices.map(d => d.deviceType);

    return res.status(200).json({
      status: 'success',
      data: {
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        currentDeviceCount: currentDevices.length,
        suggestion,
        alreadyAssigned: assignedTypes,
        availableDeviceCount: {
          byType: {}
        }
      }
    });
  } catch (error) {
    console.error('Error getting auto-assignment suggestion:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get suggestion'
    });
  }
};

/**
 * Auto-assign devices to a room
 * POST /hotels/:hotelId/rooms/:roomId/auto-assign
 */
export const autoAssignDevices = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const { includeRequired = true, includeRecommended = true, includeOptional = false } = req.body;

    const room = await Room.findById(roomId);
    if (!room || room.hotel?.toString() !== hotelId) {
      return res.status(404).json({
        status: 'failed',
        message: 'Room not found'
      });
    }

    const suggestion = generateAutoAssignmentSuggestion(room.roomType);
    const currentDevices = await Device.find({ room: roomId, hotel: hotelId });
    const assignedTypesCounts = {};

    currentDevices.forEach(d => {
      assignedTypesCounts[d.deviceType] = (assignedTypesCounts[d.deviceType] || 0) + 1;
    });

    // Get available unassigned devices
    const unassignedDevices = await Device.find({
      room: null,
      hotel: hotelId
    });

    const assignments = [];
    const skipped = [];
    const failures = [];

    // Process required devices
    if (includeRequired) {
      for (const device of suggestion.required) {
        const needed = device.count - (assignedTypesCounts[device.type] || 0);
        for (let i = 0; i < needed; i++) {
          const availableDevice = unassignedDevices.find(d => d.deviceType === device.type);
          if (availableDevice) {
            availableDevice.room = roomId;
            availableDevice.roomNumber = parseInt(room.roomNumber);
            await availableDevice.save();
            assignments.push({
              deviceId: availableDevice._id,
              deviceName: availableDevice.deviceId,
              deviceType: device.type,
              status: 'assigned'
            });
            unassignedDevices.splice(unassignedDevices.indexOf(availableDevice), 1);
          } else {
            skipped.push({
              type: device.type,
              name: device.name,
              reason: 'No unassigned devices available'
            });
          }
        }
      }
    }

    // Process recommended devices
    if (includeRecommended) {
      for (const device of suggestion.recommended) {
        const needed = device.count - (assignedTypesCounts[device.type] || 0);
        for (let i = 0; i < needed; i++) {
          const availableDevice = unassignedDevices.find(d => d.deviceType === device.type);
          if (availableDevice && canAddDevice(device.type, room.roomType, assignedTypesCounts[device.type] || 0)) {
            availableDevice.room = roomId;
            availableDevice.roomNumber = parseInt(room.roomNumber);
            await availableDevice.save();
            assignments.push({
              deviceId: availableDevice._id,
              deviceName: availableDevice.deviceId,
              deviceType: device.type,
              status: 'assigned'
            });
            assignedTypesCounts[device.type] = (assignedTypesCounts[device.type] || 0) + 1;
            unassignedDevices.splice(unassignedDevices.indexOf(availableDevice), 1);
          } else if (availableDevice) {
            skipped.push({
              type: device.type,
              name: device.name,
              reason: 'Maximum devices of this type already assigned'
            });
          }
        }
      }
    }

    // Process optional devices
    if (includeOptional) {
      for (const device of suggestion.optional) {
        const availableDevice = unassignedDevices.find(d => d.deviceType === device.type);
        if (availableDevice && canAddDevice(device.type, room.roomType, assignedTypesCounts[device.type] || 0)) {
          availableDevice.room = roomId;
          availableDevice.roomNumber = parseInt(room.roomNumber);
          await availableDevice.save();
          assignments.push({
            deviceId: availableDevice._id,
            deviceName: availableDevice.deviceId,
            deviceType: device.type,
            status: 'assigned'
          });
          assignedTypesCounts[device.type] = (assignedTypesCounts[device.type] || 0) + 1;
          unassignedDevices.splice(unassignedDevices.indexOf(availableDevice), 1);
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Auto-assigned ${assignments.length} device(s) to Room ${room.roomNumber}`,
      data: {
        roomId: room._id,
        roomNumber: room.roomNumber,
        assignments,
        skipped,
        summary: {
          assigned: assignments.length,
          skipped: skipped.length,
          failures: failures.length
        }
      }
    });
  } catch (error) {
    console.error('Error auto-assigning devices:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to auto-assign devices'
    });
  }
};

/**
 * Get available unassigned devices for a room type
 * GET /hotels/:hotelId/rooms/:roomId/available-devices
 */
export const getAvailableDevicesForRoom = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room || room.hotel?.toString() !== hotelId) {
      return res.status(404).json({
        status: 'failed',
        message: 'Room not found'
      });
    }

    const compatibility = getCompatibleDevices(room.roomType);
    const unassignedDevices = await Device.find({
      room: null,
      hotel: hotelId
    });

    // Group by type and filter for compatibility
    const availableByType = {};
    compatibility.required.concat(compatibility.recommended).concat(compatibility.optional).forEach(type => {
      availableByType[type] = unassignedDevices.filter(d => d.deviceType === type);
    });

    return res.status(200).json({
      status: 'success',
      data: {
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        availableByType,
        totalAvailable: unassignedDevices.length
      }
    });
  } catch (error) {
    console.error('Error fetching available devices:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch available devices'
    });
  }
};

/**
 * Bulk auto-assign devices to all rooms in hotel
 * POST /hotels/:hotelId/bulk-auto-assign
 */
export const bulkAutoAssignDevices = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { roomIds, includeRequired = true, includeRecommended = true } = req.body;

    const hotel = await Room.findOne({ _id: { $in: roomIds || [] }, hotel: hotelId });
    if (!hotel && roomIds && roomIds.length > 0) {
      return res.status(404).json({
        status: 'failed',
        message: 'Hotel not found'
      });
    }

    // Get all rooms to process
    let rooms;
    if (roomIds && roomIds.length > 0) {
      rooms = await Room.find({ _id: { $in: roomIds }, hotel: hotelId });
    } else {
      rooms = await Room.find({ hotel: hotelId });
    }

    const results = [];
    let totalAssigned = 0;

    for (const room of rooms) {
      const suggestion = generateAutoAssignmentSuggestion(room.roomType);
      const currentDevices = await Device.find({ room: room._id, hotel: hotelId });
      const assignedTypesCounts = {};

      currentDevices.forEach(d => {
        assignedTypesCounts[d.deviceType] = (assignedTypesCounts[d.deviceType] || 0) + 1;
      });

      const unassignedDevices = await Device.find({
        room: null,
        hotel: hotelId
      });

      const roomAssignments = [];

      // Auto-assign to this room
      if (includeRequired) {
        for (const device of suggestion.required) {
          const needed = device.count - (assignedTypesCounts[device.type] || 0);
          for (let i = 0; i < needed; i++) {
            const availableDevice = unassignedDevices.find(d => d.deviceType === device.type);
            if (availableDevice) {
              availableDevice.room = room._id;
              availableDevice.roomNumber = parseInt(room.roomNumber);
              await availableDevice.save();
              roomAssignments.push(availableDevice.deviceId);
              unassignedDevices.splice(unassignedDevices.indexOf(availableDevice), 1);
            }
          }
        }
      }

      if (includeRecommended) {
        for (const device of suggestion.recommended) {
          const needed = device.count - (assignedTypesCounts[device.type] || 0);
          for (let i = 0; i < needed; i++) {
            const availableDevice = unassignedDevices.find(d => d.deviceType === device.type);
            if (availableDevice && canAddDevice(device.type, room.roomType, assignedTypesCounts[device.type] || 0)) {
              availableDevice.room = room._id;
              availableDevice.roomNumber = parseInt(room.roomNumber);
              await availableDevice.save();
              roomAssignments.push(availableDevice.deviceId);
              assignedTypesCounts[device.type] = (assignedTypesCounts[device.type] || 0) + 1;
              unassignedDevices.splice(unassignedDevices.indexOf(availableDevice), 1);
            }
          }
        }
      }

      totalAssigned += roomAssignments.length;
      results.push({
        roomId: room._id,
        roomNumber: room.roomNumber,
        assigned: roomAssignments.length,
        devices: roomAssignments
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Auto-assigned ${totalAssigned} device(s) to ${results.length} room(s)`,
      data: {
        hotelId,
        results,
        summary: {
          roomsProcessed: results.length,
          totalDevicesAssigned: totalAssigned
        }
      }
    });
  } catch (error) {
    console.error('Error bulk auto-assigning:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to bulk auto-assign devices'
    });
  }
};

export default {
  getAutoAssignmentSuggestion,
  autoAssignDevices,
  getAvailableDevicesForRoom,
  bulkAutoAssignDevices
};
