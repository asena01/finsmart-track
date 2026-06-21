
import tuyaSmartLockService from './tuyaSmartLockService.js';
import ttLockSmartLockService from './ttLockSmartLockService.js';

/**
 * Unified Smart Lock Service
 * Orchestrates calls between Tuya and TTLock based on configuration or device type.
 * Currently, it prefers TTLock if configured, otherwise falls back to Tuya.
 */
class SmartLockService {
  /**
   * Determine which provider to use for a device.
   * This can be based on environment variables, device metadata, or explicit provider flag.
   */
  getProvider(provider = null) {
    if (provider === 'ttlock') return ttLockSmartLockService;

    // Default logic: Prefer Tuya for now as requested
    return tuyaSmartLockService;
  }

  async unlockDevice(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.unlockDevice(deviceId, options.method);
  }

  async lockDevice(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.lockDevice(deviceId);
  }

  async getDeviceStatus(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.getDeviceStatus(deviceId);
  }

  async addTemporaryAccess(deviceId, guestName, pin, expiresIn, options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.addTemporaryAccess(deviceId, guestName, pin, expiresIn, options.timeZone);
  }

  async removeTemporaryAccess(deviceId, pin, options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.removeTemporaryAccess(deviceId, pin);
  }

  async isDeviceOnline(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.isDeviceOnline) {
      return provider.isDeviceOnline(deviceId);
    }
    return true; // Assume online for dummy
  }

  async getDoorLockOpenLogs(deviceId, startTime, endTime, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.getDoorLockOpenLogs) {
      return provider.getDoorLockOpenLogs(deviceId, startTime, endTime);
    }
    return { success: true, logs: [] };
  }

  async getDoorLockAlarmLogs(deviceId, startTime, endTime, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.getDoorLockAlarmLogs) {
      return provider.getDoorLockAlarmLogs(deviceId, startTime, endTime);
    }
    return { success: true, logs: [] };
  }

  async getDoorbellAlarmLogs(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.getDoorbellAlarmLogs) {
      return provider.getDoorbellAlarmLogs(deviceId, options);
    }
    return { success: true, records: [] };
  }

  async supportsRemoteUnlock(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.supportsRemoteUnlock) {
      return provider.supportsRemoteUnlock(deviceId);
    }
    return { supported: true }; // Assume supported for dummy
  }

  async ensureDeviceUser(deviceId, identity, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.ensureDeviceUser) {
      return provider.ensureDeviceUser(deviceId, identity);
    }
    return { userId: 'dummy_user_id', created: false };
  }

  async listDoorLockTemporaryPasswords(deviceId, valid, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.listDoorLockTemporaryPasswords) {
      return provider.listDoorLockTemporaryPasswords(deviceId, valid);
    }
    return [];
  }

  async syncUnlockMethods(deviceId, codes, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.syncUnlockMethods) {
      return provider.syncUnlockMethods(deviceId, codes);
    }
    return { success: true };
  }

  async listUnassignedUnlockKeys(deviceId, type, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.listUnassignedUnlockKeys) {
      return provider.listUnassignedUnlockKeys(deviceId, type);
    }
    return [];
  }

  async listAssignedUnlockKeys(deviceId, userId, type, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.listAssignedUnlockKeys) {
      return provider.listAssignedUnlockKeys(deviceId, userId, type);
    }
    return [];
  }

  async allocateUnlockMethods(deviceId, userId, methods, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.allocateUnlockMethods) {
      return provider.allocateUnlockMethods(deviceId, userId, methods);
    }
    return { success: true };
  }

  async getDeviceCapabilities(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.getDeviceCapabilities) {
      return provider.getDeviceCapabilities(deviceId);
    }
    return { success: true, codes: [] };
  }

  async getDoorLockTemporaryPassword(deviceId, passwordId, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.getDoorLockTemporaryPassword) {
      return provider.getDoorLockTemporaryPassword(deviceId, passwordId);
    }
    return null;
  }

  // Pass-through for Tuya specific methods if needed, or implement TTLock equivalents
  async getRemoteUnlockRequestStatus(deviceId, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.getRemoteUnlockRequestStatus) {
      return provider.getRemoteUnlockRequestStatus(deviceId);
    }
    // TTLock might not have an exact equivalent yet
    return { success: false, error: 'Method not supported by provider' };
  }

  async rejectRemoteUnlockRequest(deviceId, type, options = {}) {
    const provider = this.getProvider(options.provider);
    if (provider.rejectRemoteUnlockRequest) {
      return provider.rejectRemoteUnlockRequest(deviceId, type);
    }
    return { success: false, error: 'Method not supported by provider' };
  }
}

export default new SmartLockService();
