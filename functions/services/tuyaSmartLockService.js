import crypto from 'crypto';
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

/**
 * Tuya Smart Lock Service
 * Handles all smart lock device operations via Tuya IoT API
 */

class TuyaSmartLockService {
  constructor() {
    this.accessToken = null;
    this.tokenExpire = null;
  }

  getBaseUrl() {
    return process.env.TUYA_REGION || 'https://openapi.tuyaeu.com';
  }

  getAccessKey() {
    return process.env.TUYA_ACCESS_KEY || process.env.TUYA_CLIENT_ID;
  }

  getSecretKey() {
    return process.env.TUYA_SECRET_KEY || process.env.TUYA_CLIENT_SECRET;
  }

  getContext() {
    return new TuyaContext({
      baseUrl: this.getBaseUrl(),
      accessKey: this.getAccessKey(),
      secretKey: this.getSecretKey(),
    });
  }

  getConfigurationError() {
    const accessKey = this.getAccessKey();
    const secretKey = this.getSecretKey();
    console.log('Checking Tuya configuration', accessKey);
    if (!accessKey) {
      return 'TUYA_ACCESS_KEY (or TUYA_CLIENT_ID) is not configured';
    }
    if (!secretKey) {
      return 'TUYA_SECRET_KEY (or TUYA_CLIENT_SECRET) is not configured';
    }
    return null;
  }

  /**
   * Make authenticated request to Tuya API
   */
  async makeRequest(method, endpoint, body = null, query = '') {
    try {
      const configError = this.getConfigurationError();
      if (configError) {
        throw new Error(configError);
      }

      const context = this.getContext();
      const normalizedQuery = typeof query === 'string' && query.length > 0
        ? Object.fromEntries(new URLSearchParams(query))
        : query || undefined;
      const data = await context.request({
        path: endpoint.startsWith('/v') ? endpoint : `/v1.0${endpoint}`,
        method,
        ...(normalizedQuery ? { query: normalizedQuery } : {}),
        ...(body ? { body } : {})
      });

      if (!data.success) {
        throw new Error(`Tuya API Error: ${data.msg || 'Unknown error'}`);
      }

      return data.result;
    } catch (error) {
      console.error('❌ Tuya API request failed:', error);
      throw error;
    }
  }

  /**
   * Unlock a smart lock device
   * deviceId: Tuya device ID
   * method: 'password' | 'remote' | 'app'
   */
  async unlockDevice(deviceId, method = 'remote') {
    try {
      const remoteUnlockState = await this.getRemoteUnlockMethods(deviceId).catch(() => null);
      if (remoteUnlockState?.remote_unlock_type === 'remoteUnlockWithoutPwd' && remoteUnlockState?.open === false) {
        await this.setRemoteUnlockConfig(deviceId, 'remoteUnlockWithoutPwd', true).catch((error) => {
          console.warn('⚠️ Failed to enable password-free remote unlock before unlock attempt:', deviceId, error.message);
        });
      }

      const remoteTicket = await this.getRemoteUnlockTicket(deviceId);
      if (!remoteTicket?.ticket_id) {
        throw new Error('Tuya remote unlock ticket response is missing ticket_id');
      }

      const endpointAttempts = [
        {
          label: 'password-free/door-operate',
          endpoint: `/smart-lock/devices/${deviceId}/password-free/door-operate`,
          body: {
            ticket_id: remoteTicket.ticket_id,
            open: true
          }
        },
        {
          label: 'door-lock/password-free/open-door',
          endpoint: `/devices/${deviceId}/door-lock/password-free/open-door`,
          body: {
            ticket_id: remoteTicket.ticket_id
          }
        },
        {
          label: 'door-lock/password-free/open-door v1.1',
          endpoint: `/v1.1/devices/${deviceId}/door-lock/password-free/open-door`,
          body: {
            ticket_id: remoteTicket.ticket_id,
            channel_id: 1
          }
        }
      ];

      let lastError = null;
      for (const attempt of endpointAttempts) {
        try {
          const result = await this.makeRequest('POST', attempt.endpoint, attempt.body);
          console.log(`✅ Device unlocked via ${attempt.label}:`, deviceId, result);
          return {
            success: true,
            deviceId,
            method,
            remoteTicketId: remoteTicket.ticket_id,
            unlockMethod: attempt.label,
            timestamp: new Date(),
            result
          };
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Remote unlock attempt failed via ${attempt.label}:`, deviceId, error.message);
        }
      }

      throw lastError || new Error('Failed to unlock smart lock through all supported remote unlock endpoints');
    } catch (error) {
      console.error('❌ Failed to unlock device:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Lock a smart lock device
   */
  async lockDevice(deviceId) {
    try {
      const endpoint = `/devices/${deviceId}/commands`;

      const body = {
        commands: [
          {
            code: 'lock',
            value: true // true = lock
          }
        ]
      };

      const result = await this.makeRequest('POST', endpoint, body);
      console.log('✅ Device locked:', deviceId, result);
      return {
        success: true,
        deviceId,
        timestamp: new Date(),
        result
      };
    } catch (error) {
      console.error('❌ Failed to lock device:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get device status (lock status, battery, etc.)
   */
  async getDeviceStatus(deviceId) {
    try {
      const endpoint = `/devices/${deviceId}/status`;
      const result = await this.makeRequest('GET', endpoint);

      const statusMap = {};
      if (Array.isArray(result)) {
        result.forEach(item => {
          statusMap[item.code] = item.value;
        });
      }

      return {
        success: true,
        deviceId,
        lockStatus: statusMap.lock !== undefined ? (statusMap.lock === false ? 'unlocked' : 'locked') : 'unknown',
        battery: statusMap.battery_percentage || null,
        rawStatus: statusMap,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get device status:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async getRemoteUnlockRequestStatus(deviceId) {
    const status = await this.getDeviceStatus(deviceId);
    if (!status.success) {
      return status;
    }

    const countdownSeconds = Number(status.rawStatus?.unlock_request);
    return {
      success: true,
      deviceId,
      pending: Number.isFinite(countdownSeconds) && countdownSeconds > 0,
      countdownSeconds: Number.isFinite(countdownSeconds) ? countdownSeconds : 0,
      rawStatus: status.rawStatus,
      timestamp: new Date()
    };
  }

  async getDoorbellAlarmLogs(deviceId, options = {}) {
    const pageNo = Number(options.pageNo || 1);
    const pageSize = Number(options.pageSize || 20);

    const result = await this.makeRequest(
      'GET',
      `/devices/${deviceId}/door-lock/alarm-logs`,
      null,
      {
        codes: 'doorbell',
        page_no: pageNo,
        page_size: pageSize
      }
    );

    const records = Array.isArray(result?.records)
      ? result.records
      : Array.isArray(result?.list)
        ? result.list
        : Array.isArray(result)
          ? result
          : [];

    return {
      success: true,
      deviceId,
      total: Number(result?.total || records.length || 0),
      records
    };
  }

  normalizeCapabilityCodes(result) {
    if (Array.isArray(result)) {
      return result.map((item) => item?.code).filter(Boolean);
    }

    if (Array.isArray(result?.functions)) {
      return result.functions.map((item) => item?.code).filter(Boolean);
    }

    if (Array.isArray(result?.status)) {
      return result.status.map((item) => item?.code).filter(Boolean);
    }

    if (Array.isArray(result?.commands)) {
      return result.commands.map((item) => item?.code).filter(Boolean);
    }

    return [];
  }

  summarizeCapabilityDetails(result) {
    const entries = [];
    const pushEntries = (items = [], source = 'unknown') => {
      items.forEach((item) => {
        if (!item?.code) return;
        entries.push({
          source,
          code: item.code,
          type: item.type || null,
          values: item.values || item.value || null
        });
      });
    };

    if (Array.isArray(result)) {
      pushEntries(result, 'array');
      return entries;
    }

    if (Array.isArray(result?.functions)) {
      pushEntries(result.functions, 'functions');
    }

    if (Array.isArray(result?.status)) {
      pushEntries(result.status, 'status');
    }

    if (Array.isArray(result?.commands)) {
      pushEntries(result.commands, 'commands');
    }

    return entries;
  }

  buildOfflinePasswordName(baseName, effectiveTime) {
    const normalizedBase = String(baseName || 'Guest')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20);
    const suffix = String(effectiveTime || Math.floor(Date.now() / 1000)).slice(-6);
    return `${normalizedBase}-${suffix}`;
  }

  async getDeviceCapabilities(deviceId) {
    const endpointCandidates = [
      `/devices/${deviceId}/functions`,
      `/devices/${deviceId}/specifications`,
      `/devices/${deviceId}/status`
    ];

    const discoveredCodes = new Set();
    const capabilityDetails = [];
    const errors = [];

    for (const endpoint of endpointCandidates) {
      try {
        const result = await this.makeRequest('GET', endpoint);
        const codes = this.normalizeCapabilityCodes(result);
        codes.forEach((code) => discoveredCodes.add(code));
        capabilityDetails.push(...this.summarizeCapabilityDetails(result).map((detail) => ({
          endpoint,
          ...detail
        })));
      } catch (error) {
        errors.push(`${endpoint}: ${error.message}`);
      }
    }

    return {
      success: discoveredCodes.size > 0,
      deviceId,
      codes: [...discoveredCodes],
      details: capabilityDetails,
      errors,
      timestamp: new Date()
    };
  }

  getAesAlgorithmForKey(keyBuffer) {
    const algorithmMap = {
      16: 'aes-128-ecb',
      24: 'aes-192-ecb',
      32: 'aes-256-ecb'
    };

    return algorithmMap[keyBuffer.length] || null;
  }

  buildKeyCandidates(seed, prefix) {
    const candidates = [];

    if (!seed) {
      return candidates;
    }

    const rawBuffer = Buffer.from(seed, 'utf8');
    if (this.getAesAlgorithmForKey(rawBuffer)) {
      candidates.push({ label: `${prefix}:utf8`, key: rawBuffer });
    }

    if (/^[0-9a-fA-F]+$/.test(seed) && seed.length % 2 === 0) {
      const hexBuffer = Buffer.from(seed, 'hex');
      if (this.getAesAlgorithmForKey(hexBuffer)) {
        candidates.push({ label: `${prefix}:hex`, key: hexBuffer });
      }
    }

    candidates.push({
      label: `${prefix}:md5`,
      key: crypto.createHash('md5').update(seed, 'utf8').digest()
    });

    return candidates;
  }

  getTicketKeyCandidates() {
    const accessKey = this.getAccessKey();
    const secretKey = this.getSecretKey();
    return [
      ...this.buildKeyCandidates(accessKey, 'accessKey'),
      ...this.buildKeyCandidates(secretKey, 'secretKey')
    ];
  }

  decryptTicketKey(ticketKeyHex) {
    const encryptedTicket = Buffer.from(ticketKeyHex, 'hex');
    const candidates = this.getTicketKeyCandidates();
    const attempts = [];

    for (const candidate of candidates) {
      const algorithm = this.getAesAlgorithmForKey(candidate.key);
      if (!algorithm) {
        attempts.push({ label: candidate.label, error: 'Unsupported AES key length' });
        continue;
      }

      try {
        const decipher = crypto.createDecipheriv(algorithm, candidate.key, null);
        decipher.setAutoPadding(true);
        const decrypted = Buffer.concat([
          decipher.update(encryptedTicket),
          decipher.final()
        ]);

        attempts.push({
          label: candidate.label,
          success: true,
          keyLength: decrypted.length,
          previewHex: decrypted.toString('hex').toUpperCase().slice(0, 32)
        });

        return {
          secretKey: decrypted,
          strategy: candidate.label,
          attempts
        };
      } catch (error) {
        attempts.push({ label: candidate.label, error: error.message });
      }
    }

    return {
      secretKey: null,
      strategy: null,
      attempts
    };
  }

  encryptTemporaryPassword(pin, secretKey) {
    const algorithm = this.getAesAlgorithmForKey(secretKey);
    if (!algorithm) {
      throw new Error(`Unsupported ticket secret length: ${secretKey.length}`);
    }

    const cipher = crypto.createCipheriv(algorithm, secretKey, null);
    cipher.setAutoPadding(true);
    return Buffer.concat([
      cipher.update(String(pin), 'utf8'),
      cipher.final()
    ]).toString('hex').toUpperCase();
  }

  async getPasswordTicket(deviceId) {
    return this.makeRequest('POST', `/devices/${deviceId}/door-lock/password-ticket`, {});
  }

  async getRemoteUnlockTicket(deviceId) {
    return this.makeRequest('POST', `/smart-lock/devices/${deviceId}/password-ticket`, {});
  }

  async getRemoteUnlockMethods(deviceId) {
    return this.makeRequest('GET', `/devices/${deviceId}/door-lock/remote-unlocks`);
  }

  async setRemoteUnlockConfig(deviceId, remoteUnlockType = 'remoteUnlockWithoutPwd', open = true) {
    return this.makeRequest('POST', `/devices/${deviceId}/door-lock/remote-unlock/config`, {
      remote_unlock_type: remoteUnlockType,
      open
    });
  }

  async rejectRemoteUnlockRequest(deviceId, type = 1) {
    try {
      const result = await this.makeRequest(
        'PUT',
        `/devices/${deviceId}/door-lock/password-free/open-door/cancel`,
        { type }
      );
      return {
        success: true,
        deviceId,
        type,
        timestamp: new Date(),
        result
      };
    } catch (error) {
      console.error('❌ Failed to reject remote unlock request:', deviceId, error);
      return {
        success: false,
        deviceId,
        type,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async createDoorLockTemporaryPassword(deviceId, body) {
    return this.makeRequest('POST', `/devices/${deviceId}/door-lock/temp-password`, body);
  }

  async createDoorLockOfflineTemporaryPassword(deviceId, body) {
    return this.makeRequest('POST', `/v1.1/devices/${deviceId}/door-lock/offline-temp-password`, body);
  }

  normalizeDeviceUsers(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.users)) return result.users;
    if (Array.isArray(result?.list)) return result.list;
    return [];
  }

  async listDeviceUsers(deviceId) {
    const result = await this.makeRequest('GET', `/devices/${deviceId}/users`);
    return this.normalizeDeviceUsers(result);
  }

  async createDeviceUser(deviceId, { nickName, contact = '', sex = 1 }) {
    return this.makeRequest('POST', `/devices/${deviceId}/user`, {
      nick_name: nickName,
      sex,
      contact
    });
  }

  async updateDeviceUser(deviceId, userId, { nickName, contact = '', sex = 1 }) {
    return this.makeRequest('PUT', `/devices/${deviceId}/users/${userId}`, {
      nick_name: nickName,
      sex,
      contact
    });
  }

  async getUserDevices(uid, pageNo = 1, pageSize = 20) {
    return this.makeRequest('GET', `/smart-lock/users/${uid}/devices`, null, {
      page_no: pageNo,
      page_size: pageSize
    });
  }

  normalizeUnlockKeys(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.unlock_keys)) return result.unlock_keys;
    if (Array.isArray(result?.keys)) return result.keys;
    if (Array.isArray(result?.list)) return result.list;
    return [];
  }

  async listUnassignedUnlockKeys(deviceId, unlockType = 'password') {
    const result = await this.makeRequest('GET', `/devices/${deviceId}/door-lock/unassigned-keys`, null, {
      unlock_type: unlockType
    });
    return this.normalizeUnlockKeys(result);
  }

  async listAssignedUnlockKeys(deviceId, userId, unlockType = 'password', userType = 2) {
    const result = await this.makeRequest(
      'GET',
      `/devices/${deviceId}/door-lock/user-types/${userType}/users/${userId}/assigned-keys`,
      null,
      { unlock_type: unlockType }
    );
    return this.normalizeUnlockKeys(result);
  }

  async allocateUnlockMethods(deviceId, userId, unlockList = []) {
    return this.makeRequest('POST', `/devices/${deviceId}/door-lock/opmodes/actions/allocate`, {
      user_id: userId,
      unlock_list: unlockList
    });
  }

  async updateUnlockMethod(deviceId, unlockSn, payload) {
    return this.makeRequest('PUT', `/devices/${deviceId}/door-lock/opmodes/${unlockSn}`, payload);
  }

  async findDeviceUser(deviceId, { nickName, contact = '' }) {
    const users = await this.listDeviceUsers(deviceId);
    const normalizedNickName = String(nickName || '').trim().toLowerCase();
    const normalizedContact = String(contact || '').trim().toLowerCase();

    return users.find((user) => {
      const userNickName = String(user?.nick_name || '').trim().toLowerCase();
      const userContact = String(user?.contact || '').trim().toLowerCase();
      return (
        (normalizedNickName && userNickName === normalizedNickName) ||
        (normalizedContact && userContact === normalizedContact)
      );
    }) || null;
  }

  async ensureDeviceUser(deviceId, profile) {
    const { nickName, contact = '', sex = 1 } = profile;
    if (!nickName) {
      throw new Error('nickName is required to ensure a Tuya device user');
    }

    const existingUser = await this.findDeviceUser(deviceId, { nickName, contact });
    if (existingUser) {
      const currentNickName = String(existingUser?.nick_name || '');
      const currentContact = String(existingUser?.contact || '');
      if (currentNickName !== nickName || currentContact !== contact) {
        await this.updateDeviceUser(deviceId, existingUser.user_id, { nickName, contact, sex });
      }

      return {
        userId: existingUser.user_id,
        created: false,
        user: {
          ...existingUser,
          nick_name: nickName,
          contact
        }
      };
    }

    const createdUserId = await this.createDeviceUser(deviceId, { nickName, contact, sex });
    return {
      userId: createdUserId,
      created: true,
      user: {
        user_id: createdUserId,
        nick_name: nickName,
        contact,
        sex
      }
    };
  }

  async syncUnlockMethods(deviceId, codes = 'unlock_password') {
    return this.makeRequest('POST', `/smart-lock/devices/${deviceId}/opmodes/actions/sync`, null, {
      codes
    });
  }

  async supportsRemoteUnlock(deviceId) {
    const capabilityResult = await this.getDeviceCapabilities(deviceId).catch(() => ({
      codes: [],
      details: []
    }));
    const capabilityCodes = capabilityResult.codes || [];

    const remoteMethods = await this.getRemoteUnlockMethods(deviceId).catch(() => null);
    if (remoteMethods) {
      return {
        supported: true,
        codes: capabilityCodes,
        details: capabilityResult.details || [],
        remoteMethods
      };
    }

    const remoteTicket = await this.getRemoteUnlockTicket(deviceId).catch(() => null);
    if (remoteTicket?.ticket_id) {
      return {
        supported: true,
        codes: capabilityCodes,
        details: capabilityResult.details || [],
        remoteTicketSupported: true
      };
    }

    return {
      supported: false,
      codes: capabilityCodes,
      details: capabilityResult.details || []
    };
  }

  async listDoorLockTemporaryPasswords(deviceId, valid = true) {
    return this.makeRequest('GET', `/devices/${deviceId}/door-lock/temp-passwords`, null, {
      valid: String(valid)
    });
  }

  async getDoorLockTemporaryPassword(deviceId, passwordId) {
    const result = await this.listDoorLockTemporaryPasswords(deviceId, true);
    const passwords = Array.isArray(result) ? result : (result?.list || result?.passwords || []);
    return passwords.find((item) => String(item?.id) === String(passwordId)) || null;
  }

  async waitForDoorLockTemporaryPassword(deviceId, passwordId, options = {}) {
    const attempts = options.attempts ?? 5;
    const delayMs = options.delayMs ?? 3000;
    let lastStatus = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      lastStatus = await this.getDoorLockTemporaryPassword(deviceId, passwordId);
      if (lastStatus && lastStatus.phase !== 1 && lastStatus.delivery_status !== 1) {
        return {
          status: lastStatus,
          attempts: attempt,
          settled: true
        };
      }

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return {
      status: lastStatus,
      attempts,
      settled: false
    };
  }

  /**
   * Add temporary access password for guest
   * expiresIn: duration in seconds (e.g., 86400 for 24 hours)
   */
  async addTemporaryAccess(deviceId, guestName, pin, expiresIn, timeZone = '') {
    try {
      const configError = this.getConfigurationError();
      if (configError) {
        throw new Error(configError);
      }

      const capabilityResult = await this.getDeviceCapabilities(deviceId);
      const capabilityCodes = capabilityResult.codes || [];
      const supportsGenericTempPassword = capabilityCodes.includes('add_temp_pwd');
      const hasRemotePasswordKeyFlow =
        capabilityCodes.includes('remote_no_pd_setkey') ||
        capabilityCodes.includes('remote_no_dp_key');

      const availableCodeSummary = capabilityCodes.length > 0
        ? capabilityCodes.join(', ')
        : 'none discovered';
      const relevantDetails = (capabilityResult.details || []).filter((detail) =>
        ['remote_no_pd_setkey', 'remote_no_dp_key', 'update_all_password', 'unlock_offline_pd']
          .includes(detail.code)
      );
      if (relevantDetails.length > 0) {
        console.log('🔐 Tuya smart lock raw-capability details:', JSON.stringify(relevantDetails, null, 2));
      }

      if (capabilityCodes.includes('unlock_offline_pd')) {
        const effectiveTime = Math.floor(Date.now() / 1000);
        const invalidTime = effectiveTime + expiresIn;
        const offlinePasswordBody = {
          effective_time: effectiveTime,
          invalid_time: invalidTime,
          name: this.buildOfflinePasswordName(guestName, effectiveTime),
          type: 'multiple'
        };

        const result = await this.createDoorLockOfflineTemporaryPassword(deviceId, offlinePasswordBody);
        console.log('✅ Temporary access added via door-lock/offline-temp-password:', deviceId, result);
        return {
          success: true,
          deviceId,
          guestName,
          pin: result?.offline_temp_password || pin,
          accessCode: result?.offline_temp_password || pin,
          expiresIn,
          timeZone,
          provisioningMethod: 'door-lock/offline-temp-password',
          timestamp: new Date(),
          result,
          passwordStatus: result?.offline_temp_password_id ? {
            id: result.offline_temp_password_id,
            phase: 2,
            effective_time: result.effective_time,
            invalid_time: result.invalid_time,
            time_zone: timeZone || null
          } : null,
          passwordStatusSettled: true,
          passwordStatusAttempts: 0
        };
      }

      if (supportsGenericTempPassword) {
        const endpoint = `/devices/${deviceId}/commands`;

        const body = {
          commands: [
            {
              code: 'add_temp_pwd',
              value: {
                temp_pwd: pin,
                temp_pwd_name: guestName,
                expire_time: Math.floor(Date.now() / 1000) + expiresIn
              }
            }
          ]
        };

        const result = await this.makeRequest('POST', endpoint, body);
        console.log('✅ Temporary access added via add_temp_pwd:', deviceId, result);
        return {
          success: true,
          deviceId,
          guestName,
          pin,
          expiresIn,
          provisioningMethod: 'add_temp_pwd',
          timestamp: new Date(),
          result
        };
      }

      const ticket = await this.getPasswordTicket(deviceId);
      console.log('🔐 Tuya password ticket response:', JSON.stringify({
        ticket_id: ticket?.ticket_id,
        expire_time: ticket?.expire_time,
        has_ticket_key: Boolean(ticket?.ticket_key),
        ticket_key_length: ticket?.ticket_key?.length || 0
      }, null, 2));

      if (!ticket?.ticket_id || !ticket?.ticket_key) {
        throw new Error(`Tuya password ticket response is missing ticket_id or ticket_key. Available codes: ${availableCodeSummary}`);
      }

      const { secretKey, strategy, attempts } = this.decryptTicketKey(ticket.ticket_key);
      console.log('🔐 Tuya ticket key derivation attempts:', JSON.stringify(attempts, null, 2));

      if (!secretKey) {
        throw new Error('Unable to derive a usable AES key from Tuya ticket_key using the configured access key');
      }

      const encryptedPassword = this.encryptTemporaryPassword(pin, secretKey);
      console.log('🔐 Tuya temp password encryption details:', JSON.stringify({
        strategy,
        pinLength: String(pin).length,
        encryptedPasswordLength: encryptedPassword.length,
        hasRemotePasswordKeyFlow
      }, null, 2));

      const effectiveTime = Math.floor(Date.now() / 1000);
      const invalidTime = effectiveTime + expiresIn;
      const tempPasswordBody = {
        name: guestName,
        password: encryptedPassword,
        effective_time: effectiveTime,
        invalid_time: invalidTime,
        password_type: 'ticket',
        ticket_id: ticket.ticket_id,
        type: 0,
        time_zone: timeZone || ''
      };

      const result = await this.createDoorLockTemporaryPassword(deviceId, tempPasswordBody);
      const createdPasswordPoll = result?.id
        ? await this.waitForDoorLockTemporaryPassword(deviceId, result.id)
        : { status: null, attempts: 0, settled: false };
      const createdPasswordStatus = createdPasswordPoll.status;
      if (createdPasswordStatus) {
        console.log('🔐 Tuya temp password delivery status:', JSON.stringify({
          id: createdPasswordStatus.id,
          phase: createdPasswordStatus.phase,
          delivery_status: createdPasswordStatus.delivery_status,
          effective_time: createdPasswordStatus.effective_time,
          invalid_time: createdPasswordStatus.invalid_time,
          attempts: createdPasswordPoll.attempts,
          settled: createdPasswordPoll.settled
        }, null, 2));
      }
      console.log('✅ Temporary access added via door-lock/temp-password:', deviceId, result);
      return {
        success: true,
        deviceId,
        guestName,
        pin,
        expiresIn,
        timeZone,
        provisioningMethod: 'door-lock/temp-password',
        timestamp: new Date(),
        result,
        passwordStatus: createdPasswordStatus,
        passwordStatusSettled: createdPasswordPoll.settled,
        passwordStatusAttempts: createdPasswordPoll.attempts
      };
    } catch (error) {
      console.error('❌ Failed to add temporary access:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Remove temporary access password
   */
  async removeTemporaryAccess(deviceId, pin) {
    try {
      if (pin && typeof pin === 'object' && pin.passwordId) {
        const prefersOffline = pin.provisioningMethod === 'door-lock/offline-temp-password' || pin.offline === true;
        const endpointAttempts = prefersOffline
          ? [
            { type: 'offline', endpoint: `/devices/${deviceId}/door-lock/template/temp-password/${pin.passwordId}` },
            { type: 'online', endpoint: `/devices/${deviceId}/door-lock/temp-passwords/${pin.passwordId}` }
          ]
          : [
            { type: 'online', endpoint: `/devices/${deviceId}/door-lock/temp-passwords/${pin.passwordId}` },
            { type: 'offline', endpoint: `/devices/${deviceId}/door-lock/template/temp-password/${pin.passwordId}` }
          ];

        let lastError = null;
        for (let index = 0; index < endpointAttempts.length; index += 1) {
          const attempt = endpointAttempts[index];
          try {
            const result = await this.makeRequest('DELETE', attempt.endpoint);
            const remainingRecord = await this.getDoorLockTemporaryPassword(deviceId, pin.passwordId).catch(() => null);
            if (remainingRecord && index < endpointAttempts.length - 1) {
              console.warn(`⚠️ ${attempt.type} delete returned success but password still exists, retrying alternate delete endpoint:`, deviceId, pin.passwordId);
              continue;
            }

            console.log(`✅ Temporary access removed via ${attempt.type} password id:`, deviceId, pin.passwordId);
            return {
              success: true,
              deviceId,
              pin: pin.passwordId,
              timestamp: new Date(),
              result,
              deleteMethod: attempt.type
            };
          } catch (error) {
            lastError = error;
            const message = String(error?.message || '').toLowerCase();
            const shouldFallback = message.includes('unkown error') || message.includes('unknown error');
            if (!shouldFallback || attempt === endpointAttempts[endpointAttempts.length - 1]) {
              throw error;
            }
            console.warn(`⚠️ Failed to remove ${attempt.type} password id, retrying alternate delete endpoint:`, deviceId, pin.passwordId, error.message);
          }
        }

        throw lastError || new Error('Failed to remove temporary access password');
      }

      const endpoint = `/devices/${deviceId}/commands`;

      const body = {
        commands: [
          {
            code: 'delete_temp_pwd',
            value: pin
          }
        ]
      };

      const result = await this.makeRequest('POST', endpoint, body);
      console.log('✅ Temporary access removed:', deviceId);
      return {
        success: true,
        deviceId,
        pin,
        timestamp: new Date(),
        result
      };
    } catch (error) {
      console.error('❌ Failed to remove temporary access:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get device detail including battery, firmware version, etc.
   */
  async getDeviceDetail(deviceId) {
    try {
      const endpoint = `/devices/${deviceId}`;
      const result = await this.makeRequest('GET', endpoint);

      return {
        success: true,
        deviceId,
        deviceDetail: result,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get device detail:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get device event log
   */
  async getDeviceLog(deviceId, startTime, endTime) {
    try {
      const endpoint = `/devices/${deviceId}/logs`;
      const query = `start_time=${startTime}&end_time=${endTime}`;
      const result = await this.makeRequest('GET', endpoint, null, query);

      return {
        success: true,
        deviceId,
        logs: result,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get device log:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async getDoorLockOpenLogs(deviceId, startTime, endTime) {
    try {
      const result = await this.makeRequest('GET', `/v1.1/devices/${deviceId}/door-lock/open-logs`, null, {
        start_time: startTime,
        end_time: endTime,
        page_no: 1,
        page_size: 10
      });

      return {
        success: true,
        deviceId,
        logs: result,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get door lock open logs:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async getDoorLockAlarmLogs(deviceId, startTime, endTime) {
    try {
      const result = await this.makeRequest('GET', `/v1.1/devices/${deviceId}/door-lock/alarm-logs`, null, {
        start_time: startTime,
        end_time: endTime,
        page_no: 1,
        page_size: 10
      });

      return {
        success: true,
        deviceId,
        logs: result,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get door lock alarm logs:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if device is online
   */
  async isDeviceOnline(deviceId) {
    try {
      const status = await this.getDeviceStatus(deviceId);
      return status.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send custom command to device
   */
  async sendCommand(deviceId, code, value) {
    try {
      const endpoint = `/devices/${deviceId}/commands`;

      const body = {
        commands: [
          {
            code,
            value
          }
        ]
      };

      const result = await this.makeRequest('POST', endpoint, body);
      console.log('✅ Command sent:', deviceId, code);
      return {
        success: true,
        deviceId,
        command: code,
        timestamp: new Date(),
        result
      };
    } catch (error) {
      console.error('❌ Failed to send command:', deviceId, error);
      return {
        success: false,
        deviceId,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export default new TuyaSmartLockService();
