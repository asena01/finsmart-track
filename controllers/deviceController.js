import tuyaSmartLockService from '../services/tuyaSmartLockService.js';
import SmartLockService from '../services/smartLockService.js';
import { attachSmartLockBellSseStream } from '../services/smartLockBellSocketService.js';

const getTuyaContext = () => tuyaSmartLockService.getContext();
let ioInstance = null;

export const setDeviceControllerIo = (io) => {
    ioInstance = io;
};

const normalizeDoorLockRecords = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.records)) return result.records;
    if (Array.isArray(result?.list)) return result.list;
    if (Array.isArray(result?.logs)) return result.logs;
    return [];
};

const toMillisecondTimestamp = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return numeric > 1e12 ? numeric : numeric * 1000;
};

const mapDoorLockRecordToLog = (record) => {
    const timestamp = toMillisecondTimestamp(
        record?.time ||
        record?.event_time ||
        record?.update_time ||
        record?.gmt_create ||
        record?.create_time
    );
    const primaryStatus = Array.isArray(record?.status)
        ? record.status[0]
        : Array.isArray(record?.dps)
            ? record.dps[0]
            : record?.status;
    const code = primaryStatus?.code || record?.dpCode || record?.logCategory || record?.recordType || record?.type || 'lock_access';
    const summaryParts = [
        primaryStatus?.value,
        record?.unlockName,
        record?.userName,
        record?.nick_name,
        record?.content,
        record?.message
    ].filter(Boolean);

    return {
        code: String(code),
        value: summaryParts.length > 0
            ? summaryParts.join(' · ')
            : JSON.stringify(record),
        event_time: timestamp,
        timestamp,
        raw: record
    };
};

const dedupeDoorLockLogs = (logs = []) => {
    const seen = new Set();
    return logs.filter((log) => {
        const key = JSON.stringify([
            log.code || '',
            Number(log.event_time || log.timestamp || 0),
            String(log.value || ''),
            JSON.stringify(log.raw || {})
        ]);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

const fetchDoorLockOpenLogs = async (deviceId, startTime, endTime) => {
    const startMillis = startTime && Number.isFinite(Number(startTime))
        ? Number(startTime)
        : 0;
    const endMillis = endTime && Number.isFinite(Number(endTime))
        ? Number(endTime)
        : Date.now();
    const endpointCandidates = [
        {
            label: 'door-lock/alarm-logs v1.0 doorbell',
            path: `/v1.0/devices/${deviceId}/door-lock/alarm-logs`,
            query: {
                codes: 'doorbell',
                page_no: 1,
                page_size: 20,
            },
        },
        {
            label: 'door-lock/open-logs v1.1',
            path: `/v1.1/devices/${deviceId}/door-lock/open-logs`,
            query: {
                page_no: 1,
                page_size: 100,
                start_time: startMillis,
                end_time: endMillis,
                showMediaInfo: false,
            },
        },
        {
            label: 'door-lock/open-logs v1.0',
            path: `/v1.0/devices/${deviceId}/door-lock/open-logs`,
            query: {
                page_no: 1,
                page_size: 100,
                start_time: Math.floor(startMillis / 1000),
                end_time: Math.floor(endMillis / 1000),
            },
        },
        {
            label: 'door-lock/records',
            path: `/v1.0/devices/${deviceId}/door-lock/records`,
            query: {
                target_standard_dp_codes: 'unlock_temporary,unlock_password,unlock_card,unlock_app,unlock_key',
                start_time: startMillis,
                end_time: endMillis,
                page_no: 1,
                page_size: 100,
            },
        },
        {
            label: 'door-lock/alarm-logs v1.1',
            path: `/v1.1/devices/${deviceId}/door-lock/alarm-logs`,
            query: {
                page_no: 1,
                page_size: 100,
                codes: 'doorbell',
                showMediaInfo: false,
            },
        },
    ];

    const errors = [];
    const aggregatedLogs = [];

    for (const candidate of endpointCandidates) {
        try {
            const context = getTuyaContext();
            const response = await context.request({
                path: candidate.path,
                method: 'GET',
                query: candidate.query,
            });

            if (!response.success) {
                errors.push(`${candidate.label}: ${response.msg || 'Unknown error'}`);
                continue;
            }

            const records = normalizeDoorLockRecords(response.result).map(mapDoorLockRecordToLog);
            if (records.length > 0) {
                aggregatedLogs.push(...records);
            }
        } catch (error) {
            errors.push(`${candidate.label}: ${error.message}`);
        }
    }

    if (aggregatedLogs.length > 0) {
        const mergedLogs = dedupeDoorLockLogs(aggregatedLogs).sort(
            (left, right) => Number(right.event_time || right.timestamp || 0) - Number(left.event_time || left.timestamp || 0)
        );
        console.log(`✅ Smart lock logs fallback succeeded via merged endpoints: ${mergedLogs.length} records`);
        return mergedLogs;
    }

    console.warn(`⚠️ No smart lock records returned for ${deviceId}. Attempts: ${errors.join(' | ')}`);
    return [];
};

/**
 * Get device status from Tuya
 * GET /hotels/:hotelId/devices/:deviceId/status
 */
const getDeviceStatus = async (req, res) => {
    const { deviceId } = req.params;
    try {
        console.log(`📱 Fetching status for device: ${deviceId}`);
        const context = getTuyaContext();
        const response = await context.request({
            path: `/v1.0/devices/${deviceId}/status`,
            method: 'GET',
        });
        
        if (response.success) {
            console.log(`✅ Device status retrieved:`, response.result);
            res.status(200).json({
                status: 'success',
                data: response.result,
                deviceId
            });
        } else {
            console.error(`❌ Failed to fetch device status:`, response.msg);
            res.status(400).json({ 
                status: 'error',
                error: response.msg,
                message: "Failed to fetch device status"
            });
        }
    } catch (error) {
        console.error("❌ Error fetching device status:", error.message);
        res.status(500).json({ 
            status: 'error',
            error: "Failed to fetch device status",
            message: error.message
        });
    }
};

/**
 * Get device logs from Tuya
 * GET /hotels/:hotelId/devices/:deviceId/logs
 * Query params: start_time, end_time, codes
 */
const getDeviceLogs = async (req, res) => {
    const { deviceId } = req.params;
    const { start_time, end_time, codes } = req.query;
    
    try {
        console.log(`📋 Fetching logs for device: ${deviceId}`);
        const context = getTuyaContext();

        const buildQuery = (mode = 'full') => {
            const query = { size: mode === 'fallback' ? 20 : 100 };

            if (mode === 'full') {
                if (start_time && !Number.isNaN(Number(start_time))) {
                    query.start_time = String(start_time);
                }

                if (end_time && !Number.isNaN(Number(end_time))) {
                    query.end_time = String(end_time);
                }

                if (typeof codes === 'string' && codes.trim().length > 0) {
                    query.codes = codes.trim();
                }
            }

            return query;
        };

        const requestLogs = async (query) => context.request({
            path: `/v2.0/cloud/thing/${deviceId}/report-logs`,
            method: 'GET',
            query,
        });

        let response = await requestLogs(buildQuery('full'));

        if (!response.success && String(response.msg || '').toLowerCase().includes('illegal param')) {
            console.warn(`⚠️ Tuya rejected full log query for ${deviceId}, retrying with minimal params`);
            response = await requestLogs(buildQuery('fallback'));
        }
        
        if (response.success) {
            let logs = response.result?.logs;
            
            if ((!logs || logs.length === 0) && !codes) {
                try {
                    const doorLockLogs = await fetchDoorLockOpenLogs(deviceId, start_time, end_time);
                    if (doorLockLogs.length > 0) {
                        return res.status(200).json({
                            status: 'success',
                            deviceId,
                            logs: doorLockLogs,
                            totalLogs: doorLockLogs.length,
                            timeDifferences: [],
                            message: `Retrieved ${doorLockLogs.length} smart lock access records`
                        });
                    }
                } catch (doorLockError) {
                    console.warn(`⚠️ Smart lock open-log fallback failed for ${deviceId}:`, doorLockError.message);
                }
            }

            if (!logs || logs.length === 0) {
                return res.status(200).json({
                    status: 'success',
                    deviceId,
                    logs: [],
                    totalLogs: 0,
                    timeDifferences: [],
                    message: "No logs found for the specified device and time range."
                });
            }
            
            // Sort logs by event_time
            logs = logs.sort((a, b) => a.event_time - b.event_time);
            
            // Calculate durations between consecutive "true" events
            const timeDifferences = calculateTrueToTrueDurations(logs);
            
            console.log(`✅ Device logs retrieved: ${logs.length} logs, ${timeDifferences.length} periods`);
            
            return res.status(200).json({
                status: 'success',
                deviceId,
                logs,
                totalLogs: logs.length,
                timeDifferences,
                message: `Retrieved ${logs.length} logs and calculated ${timeDifferences.length} time periods`
            });
        } else {
            console.error(`❌ Failed to fetch device logs:`, response.msg);
            if (!codes) {
                try {
                    const doorLockLogs = await fetchDoorLockOpenLogs(deviceId, start_time, end_time);
                    if (doorLockLogs.length > 0) {
                        return res.status(200).json({
                            status: 'success',
                            deviceId,
                            logs: doorLockLogs,
                            totalLogs: doorLockLogs.length,
                            timeDifferences: [],
                            message: `Retrieved ${doorLockLogs.length} smart lock access records`
                        });
                    }
                } catch (doorLockError) {
                    console.warn(`⚠️ Smart lock open-log fallback failed for ${deviceId}:`, doorLockError.message);
                }
            }
            return res.status(200).json({
                status: 'success',
                deviceId,
                logs: [],
                totalLogs: 0,
                timeDifferences: [],
                message: response.msg === 'illegal param'
                    ? 'This device does not expose report logs through the Tuya log endpoint.'
                    : response.msg
            });
        }
    } catch (error) {
        console.error("❌ Error fetching device logs:", error.message);
        return res.status(500).json({ 
            status: 'error',
            error: "Failed to fetch device logs",
            message: error.message
        });
    }
};

const getDeviceBellStream = async (req, res) => {
    const { deviceId } = req.params;

    if (!ioInstance) {
        return res.status(503).json({
            status: 'error',
            message: 'Bell realtime service is not initialized.'
        });
    }

    attachSmartLockBellSseStream(ioInstance, deviceId, req, res);
};

const getDeviceRemoteUnlockRequestStatus = async (req, res) => {
    const { deviceId } = req.params;

    try {
        const result = await SmartLockService.getRemoteUnlockRequestStatus(deviceId);
        if (!result.success) {
            const message = result.error || 'Failed to fetch remote unlock request status';
            const isPermissionError = /permission deny/i.test(message);
            if (isPermissionError) {
                return res.status(200).json({
                    status: 'success',
                    message: 'Remote unlock request status is unavailable for this Tuya project scope, but manual approve/reject can still be attempted.',
                    deviceId,
                    data: {
                        success: false,
                        pending: false,
                        countdownSeconds: 0,
                        unavailable: true,
                        reason: 'permission_denied'
                    }
                });
            }

            return res.status(400).json({
                status: 'failed',
                message
            });
        }

        return res.status(200).json({
            status: 'success',
            deviceId,
            data: result
        });
    } catch (error) {
        console.error('❌ Error fetching remote unlock request status:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch remote unlock request status',
            error: error.message
        });
    }
};

const approveDeviceRemoteUnlock = async (req, res) => {
    const { deviceId } = req.params;

    try {
        const requestStatus = await SmartLockService.getRemoteUnlockRequestStatus(deviceId);
        if (!requestStatus.success) {
            return res.status(400).json({
                status: 'failed',
                message: requestStatus.error || 'Failed to verify remote unlock request status'
            });
        }

        if (!requestStatus.pending) {
            return res.status(409).json({
                status: 'failed',
                message: 'There is no active remote unlock request to approve.',
                data: requestStatus
            });
        }

        const result = await SmartLockService.unlockDevice(deviceId);
        if (!result.success) {
            return res.status(400).json({
                status: 'failed',
                message: result.error || 'Failed to approve remote unlock request'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Remote unlock request approved.',
            deviceId,
            data: result
        });
    } catch (error) {
        console.error('❌ Error approving remote unlock request:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to approve remote unlock request',
            error: error.message
        });
    }
};

const remoteUnlockDevice = async (req, res) => {
    const { deviceId } = req.params;

    try {
        const result = await SmartLockService.unlockDevice(deviceId);
        if (!result.success) {
            return res.status(400).json({
                status: 'failed',
                message: result.error || 'Failed to remotely unlock device'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Remote unlock sent successfully.',
            deviceId,
            data: result
        });
    } catch (error) {
        console.error('❌ Error remotely unlocking device:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to remotely unlock device',
            error: error.message
        });
    }
};

const rejectDeviceRemoteUnlock = async (req, res) => {
    const { deviceId } = req.params;

    try {
        const requestStatus = await SmartLockService.getRemoteUnlockRequestStatus(deviceId);
        if (!requestStatus.success) {
            return res.status(400).json({
                status: 'failed',
                message: requestStatus.error || 'Failed to verify remote unlock request status'
            });
        }

        if (!requestStatus.pending) {
            return res.status(409).json({
                status: 'failed',
                message: 'There is no active remote unlock request to reject.',
                data: requestStatus
            });
        }

        const result = await SmartLockService.rejectRemoteUnlockRequest(deviceId, 1);
        if (!result.success) {
            return res.status(400).json({
                status: 'failed',
                message: result.error || 'Failed to reject remote unlock request'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Remote unlock request rejected.',
            deviceId,
            data: result
        });
    } catch (error) {
        console.error('❌ Error rejecting remote unlock request:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to reject remote unlock request',
            error: error.message
        });
    }
};

/**
 * Helper function to calculate durations between consecutive "true" events
 * Filters for motion sensor "true" states that last more than 20 minutes
 */
const calculateTrueToTrueDurations = (logs) => {
    const periods = [];
    const TIME_THRESHOLD = 20 * 60 * 1000; // 20 minutes in milliseconds
    
    // Filter only logs where code is "doorcontact_state" and value is "true"
    const trueLogs = logs.filter(log => 
        log.code === "doorcontact_state" && log.value === "true"
    );
    
    console.log(`🔍 Found ${trueLogs.length} "true" events for duration calculation`);
    
    // Calculate time difference between consecutive "true" values
    for (let i = 0; i < trueLogs.length - 1; i++) {
        const start = trueLogs[i].event_time;
        const end = trueLogs[i + 1].event_time;
        const duration = Math.abs(end - start);
        
        if (duration > TIME_THRESHOLD) {
            periods.push({
                start: new Date(start),
                end: new Date(end),
                duration: Math.round(duration / (60 * 1000)), // Convert to minutes
                durationHours: Math.round((duration / (60 * 1000)) / 60 * 100) / 100 // Convert to hours
            });
        }
    }
    
    console.log(`📊 Calculated ${periods.length} periods exceeding 20 minutes threshold`);
    return periods;
};

/**
 * Get device shadow properties from Tuya
 * GET /hotels/:hotelId/devices/:deviceId/shadow
 */
const getDeviceShadowProperties = async (req, res) => {
    const { deviceId } = req.params;
    
    try {
        console.log(`🔐 Fetching shadow properties for device: ${deviceId}`);
        const context = getTuyaContext();
        const response = await context.request({
            path: `/v2.0/cloud/thing/${deviceId}/shadow/properties`,
            method: 'GET',
        });
        
        if (response.success) {
            console.log(`✅ Device shadow properties retrieved`);
            res.status(200).json({
                status: 'success',
                data: response.result,
                deviceId
            });
        } else {
            console.error(`❌ Failed to fetch shadow properties:`, response.msg);
            res.status(400).json({ 
                status: 'error',
                error: response.msg,
                message: "Failed to fetch device shadow properties"
            });
        }
    } catch (error) {
        console.error("❌ Error fetching device shadow properties:", error.message);
        res.status(500).json({ 
            status: 'error',
            error: "Failed to fetch device shadow properties",
            message: error.message
        });
    }
};

/**
 * Get all devices from Tuya
 * GET /devices (admin only)
 */
const getAllDevices = async (req, res) => {
    try {
        console.log(`📱 Fetching all devices from Tuya`);
        const context = getTuyaContext();
        const response = await context.request({
            path: '/v2.0/cloud/thing/device',
            method: 'GET',
            query: {
                page_size: 100,
            },
        });
        
        if (response.success) {
            console.log(`✅ Retrieved ${response.result?.list?.length || 0} devices`);
            res.status(200).json({
                status: 'success',
                data: response.result,
                totalDevices: response.result?.list?.length || 0
            });
        } else {
            console.error(`❌ Failed to fetch devices:`, response.msg);
            res.status(400).json({ 
                status: 'error',
                error: response.msg,
                message: "Failed to fetch devices"
            });
        }
    } catch (error) {
        console.error("❌ Error fetching all devices:", error.message);
        res.status(500).json({ 
            status: 'error',
            error: "Failed to fetch all devices",
            message: error.message
        });
    }
};

export {
    getDeviceStatus,
    getDeviceLogs,
    getDeviceBellStream,
    getDeviceRemoteUnlockRequestStatus,
    remoteUnlockDevice,
    approveDeviceRemoteUnlock,
    rejectDeviceRemoteUnlock,
    getDeviceShadowProperties,
    getAllDevices,
    calculateTrueToTrueDurations
};
