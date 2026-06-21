/**
 * Device Compatibility Rules & Auto-Assignment Configuration
 * 
 * Defines which device types are compatible with which room types,
 * and provides auto-assignment logic based on room characteristics
 */

/**
 * Device compatibility matrix by room type
 * Shows which devices SHOULD be in each room type
 */
export const DEVICE_COMPATIBILITY = {
  single: {
    required: ['smart_lock'],
    recommended: ['smart_lock', 'door_sensor', 'light'],
    optional: ['thermostat', 'camera'],
    maxDevices: {
      smart_lock: 1,
      door_sensor: 1,
      motion_sensor: 1,
      thermostat: 1,
      light: 2,
      camera: 1,
      speaker: 0
    }
  },
  double: {
    required: ['smart_lock'],
    recommended: ['smart_lock', 'door_sensor', 'thermostat', 'light'],
    optional: ['camera', 'speaker'],
    maxDevices: {
      smart_lock: 1,
      door_sensor: 1,
      motion_sensor: 2,
      thermostat: 1,
      light: 3,
      camera: 1,
      speaker: 1
    }
  },
  suite: {
    required: ['smart_lock'],
    recommended: ['smart_lock', 'door_sensor', 'thermostat', 'light', 'speaker'],
    optional: ['camera'],
    maxDevices: {
      smart_lock: 1,
      door_sensor: 1,
      motion_sensor: 3,
      thermostat: 2,
      light: 4,
      camera: 2,
      speaker: 2
    }
  },
  deluxe: {
    required: ['smart_lock'],
    recommended: ['smart_lock', 'door_sensor', 'thermostat', 'light', 'camera', 'speaker'],
    optional: [],
    maxDevices: {
      smart_lock: 1,
      door_sensor: 1,
      motion_sensor: 3,
      thermostat: 2,
      light: 5,
      camera: 2,
      speaker: 2
    }
  },
  presidential: {
    required: ['smart_lock'],
    recommended: ['smart_lock', 'door_sensor', 'thermostat', 'light', 'camera', 'speaker'],
    optional: [],
    maxDevices: {
      smart_lock: 1,
      door_sensor: 1,
      motion_sensor: 4,
      thermostat: 3,
      light: 6,
      camera: 3,
      speaker: 3
    }
  }
};

/**
 * Device type descriptions and purposes
 */
export const DEVICE_DESCRIPTIONS = {
  smart_lock: {
    name: '🔐 Smart Lock',
    description: 'Electronic lock for keyless room entry',
    purpose: 'Guest access control',
    required: true,
    priority: 1
  },
  motion_sensor: {
    name: '🎯 Motion Sensor',
    description: 'Detects room occupancy and movement',
    purpose: 'Security, energy efficiency, occupancy tracking',
    required: false,
    priority: 2
  },
  door_sensor: {
    name: '🚪 Door Sensor',
    description: 'Detects door open and close events for monitoring',
    purpose: 'Door monitoring, security alerts, audit visibility',
    required: false,
    priority: 2
  },
  thermostat: {
    name: '🌡️ Thermostat',
    description: 'Controls room temperature and HVAC',
    purpose: 'Climate control, energy management',
    required: false,
    priority: 3
  },
  light: {
    name: '💡 Smart Light',
    description: 'Automated lighting control',
    purpose: 'Ambiance, energy efficiency, guest convenience',
    required: false,
    priority: 4
  },
  camera: {
    name: '📹 Security Camera',
    description: 'Video surveillance',
    purpose: 'Security, monitoring (where legal)',
    required: false,
    priority: 5
  },
  speaker: {
    name: '🔊 Smart Speaker',
    description: 'Audio system for announcements and entertainment',
    purpose: 'Guest communication, entertainment',
    required: false,
    priority: 6
  }
};

/**
 * Device type icons
 */
export const DEVICE_ICONS = {
  smart_lock: '🔐',
  door_sensor: '🚪',
  motion_sensor: '🎯',
  thermostat: '🌡️',
  light: '💡',
  camera: '📹',
  speaker: '🔊'
};

/**
 * Get compatible devices for a room type
 */
export const getCompatibleDevices = (roomType) => {
  return DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
};

/**
 * Check if a device type is compatible with a room type
 */
export const isDeviceCompatible = (deviceType, roomType) => {
  const compatibility = DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
  return (
    compatibility.required.includes(deviceType) ||
    compatibility.recommended.includes(deviceType) ||
    compatibility.optional.includes(deviceType)
  );
};

/**
 * Check if a device is required for a room type
 */
export const isDeviceRequired = (deviceType, roomType) => {
  const compatibility = DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
  return compatibility.required.includes(deviceType);
};

/**
 * Check if adding a device would exceed room limit
 */
export const canAddDevice = (deviceType, roomType, currentCount) => {
  const compatibility = DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
  const maxAllowed = compatibility.maxDevices[deviceType] || 0;
  return currentCount < maxAllowed;
};

/**
 * Get missing required devices for a room
 */
export const getMissingRequiredDevices = (roomType, assignedDeviceTypes) => {
  const compatibility = DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
  return compatibility.required.filter(type => !assignedDeviceTypes.includes(type));
};

/**
 * Get recommended devices that should be added
 */
export const getRecommendedDevices = (roomType, assignedDeviceTypes) => {
  const compatibility = DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
  return compatibility.recommended.filter(type => !assignedDeviceTypes.includes(type));
};

/**
 * Generate auto-assignment suggestion
 * Returns array of device types to assign for optimal room setup
 */
export const generateAutoAssignmentSuggestion = (roomType) => {
  const compatibility = DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
  
  return {
    required: compatibility.required.map(type => ({
      type,
      name: DEVICE_DESCRIPTIONS[type].name,
      priority: DEVICE_DESCRIPTIONS[type].priority,
      count: 1
    })),
    recommended: compatibility.recommended.map(type => ({
      type,
      name: DEVICE_DESCRIPTIONS[type].name,
      priority: DEVICE_DESCRIPTIONS[type].priority,
      count: Math.min(2, compatibility.maxDevices[type])
    })),
    optional: compatibility.optional.map(type => ({
      type,
      name: DEVICE_DESCRIPTIONS[type].name,
      priority: DEVICE_DESCRIPTIONS[type].priority,
      count: Math.min(1, compatibility.maxDevices[type])
    }))
  };
};

/**
 * Validate room-device assignment
 */
export const validateAssignment = (deviceType, roomType, currentDevices = []) => {
  const errors = [];
  const warnings = [];

  // Check compatibility
  if (!isDeviceCompatible(deviceType, roomType)) {
    errors.push(`${DEVICE_DESCRIPTIONS[deviceType]?.name} is not compatible with ${roomType} rooms`);
  }

  // Check count limit
  const currentCount = currentDevices.filter(d => d.deviceType === deviceType).length;
  const compatibility = DEVICE_COMPATIBILITY[roomType] || DEVICE_COMPATIBILITY.double;
  const maxAllowed = compatibility.maxDevices[deviceType] || 0;

  if (currentCount >= maxAllowed) {
    errors.push(`Maximum ${maxAllowed} ${DEVICE_DESCRIPTIONS[deviceType]?.name}(s) allowed per ${roomType} room`);
  }

  // Check if required devices are already assigned
  const missingRequired = getMissingRequiredDevices(roomType, currentDevices.map(d => d.deviceType));
  if (missingRequired.length > 0 && !missingRequired.includes(deviceType)) {
    warnings.push(`Missing required device(s): ${missingRequired.map(t => DEVICE_DESCRIPTIONS[t].name).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendation: isDeviceRequired(deviceType, roomType)
      ? 'This device is required for this room type'
      : isDeviceCompatible(deviceType, roomType)
      ? 'This device is recommended for this room type'
      : 'This device is optional for this room type'
  };
};

export default {
  DEVICE_COMPATIBILITY,
  DEVICE_DESCRIPTIONS,
  DEVICE_ICONS,
  getCompatibleDevices,
  isDeviceCompatible,
  isDeviceRequired,
  canAddDevice,
  getMissingRequiredDevices,
  getRecommendedDevices,
  generateAutoAssignmentSuggestion,
  validateAssignment
};
