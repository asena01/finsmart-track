import SmartLockService from './smartLockService.js';

const DEVICE_ROOM_PREFIX = 'smart-lock-bell:';
const POLL_INTERVAL_MS = 5000;
const BELL_WINDOW_MS = 15 * 1000;

const devicePollers = new Map();
const socketSubscriptions = new Map();
const sseStreams = new Map();

const getDeviceRoom = (deviceId) => `${DEVICE_ROOM_PREFIX}${deviceId}`;

const toTimestamp = (record) => {
  const numeric = Number(record?.update_time || record?.event_time || record?.time || 0);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1e12 ? numeric : numeric * 1000;
};

const buildPayload = (deviceId, records = []) => {
  const cutoff = Date.now() - BELL_WINDOW_MS;
  const recentRecords = records
    .map((record) => ({
      code: 'doorbell',
      value: 'true',
      event_time: toTimestamp(record),
      raw: record
    }))
    .filter((record) => record.event_time >= cutoff)
    .sort((left, right) => right.event_time - left.event_time);

  return {
    event: 'smart-lock-bell-updated',
    deviceId,
    bellCount: recentRecords.length,
    recentEvents: recentRecords,
    lastEventTime: recentRecords[0]?.event_time || null,
    updatedAt: new Date().toISOString()
  };
};

const emitBellUpdate = async (io, deviceId) => {
  try {
    const response = await SmartLockService.getDoorbellAlarmLogs(deviceId, {
      pageNo: 1,
      pageSize: 20
    });
    const payload = buildPayload(deviceId, response.records || []);
    const poller = devicePollers.get(deviceId);
    if (poller) {
      poller.lastPayload = payload;
    }
    io.to(getDeviceRoom(deviceId)).emit('smart-lock-bell-updated', payload);
    pushSseEvent(deviceId, payload);
  } catch (error) {
    console.warn(`⚠️ Failed to poll doorbell logs for ${deviceId}:`, error.message);
    const payload = {
      event: 'smart-lock-bell-updated',
      deviceId,
      bellCount: 0,
      recentEvents: [],
      lastEventTime: null,
      updatedAt: new Date().toISOString(),
      error: error.message
    };
    io.to(getDeviceRoom(deviceId)).emit('smart-lock-bell-updated', payload);
    pushSseEvent(deviceId, payload);
  }
};

const registerSseStream = (deviceId, res) => {
  const streams = sseStreams.get(deviceId) || new Set();
  streams.add(res);
  sseStreams.set(deviceId, streams);
};

const unregisterSseStream = (deviceId, res) => {
  const streams = sseStreams.get(deviceId);
  if (!streams) return;
  streams.delete(res);
  if (!streams.size) {
    sseStreams.delete(deviceId);
  }
};

const pushSseEvent = (deviceId, payload) => {
  const streams = sseStreams.get(deviceId);
  if (!streams?.size) {
    return;
  }

  const data = `event: smart-lock-bell-updated\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of streams) {
    res.write(data);
  }
};

const stopDevicePoller = (deviceId) => {
  const poller = devicePollers.get(deviceId);
  if (!poller) return;
  clearInterval(poller.interval);
  devicePollers.delete(deviceId);
};

const ensureDevicePoller = (io, deviceId) => {
  const existing = devicePollers.get(deviceId);
  if (existing) {
    return existing;
  }

  const interval = setInterval(() => {
    void emitBellUpdate(io, deviceId);
  }, POLL_INTERVAL_MS);

  const poller = {
    subscribers: new Set(),
    interval,
    lastPayload: null
  };

  devicePollers.set(deviceId, poller);
  void emitBellUpdate(io, deviceId);
  return poller;
};

const subscribeSocketToDevice = (io, socket, deviceId) => {
  if (!deviceId) return;

  const poller = ensureDevicePoller(io, deviceId);
  poller.subscribers.add(socket.id);

  let subscriptions = socketSubscriptions.get(socket.id);
  if (!subscriptions) {
    subscriptions = new Set();
    socketSubscriptions.set(socket.id, subscriptions);
  }
  subscriptions.add(deviceId);

  socket.join(getDeviceRoom(deviceId));
  if (poller.lastPayload) {
    socket.emit('smart-lock-bell-updated', poller.lastPayload);
  }
};

const unsubscribeSocketFromDevice = (socket, deviceId) => {
  if (!deviceId) return;

  socket.leave(getDeviceRoom(deviceId));

  const subscriptions = socketSubscriptions.get(socket.id);
  if (subscriptions) {
    subscriptions.delete(deviceId);
    if (subscriptions.size === 0) {
      socketSubscriptions.delete(socket.id);
    }
  }

  const poller = devicePollers.get(deviceId);
  if (!poller) return;

  poller.subscribers.delete(socket.id);
  if (poller.subscribers.size === 0) {
    stopDevicePoller(deviceId);
  }
};

const unsubscribeSocketFromAllDevices = (socket) => {
  const subscriptions = socketSubscriptions.get(socket.id);
  if (!subscriptions) return;

  Array.from(subscriptions).forEach((deviceId) => {
    unsubscribeSocketFromDevice(socket, deviceId);
  });
};

export const initializeSmartLockBellSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('subscribe-smart-lock-bell', (payload = {}) => {
      subscribeSocketToDevice(io, socket, payload.deviceId);
    });

    socket.on('unsubscribe-smart-lock-bell', (payload = {}) => {
      unsubscribeSocketFromDevice(socket, payload.deviceId);
    });

    socket.on('disconnect', () => {
      unsubscribeSocketFromAllDevices(socket);
    });
  });
};

export const attachSmartLockBellSseStream = (io, deviceId, req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const poller = ensureDevicePoller(io, deviceId);
  registerSseStream(deviceId, res);

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, deviceId })}\n\n`);
  if (poller.lastPayload) {
    res.write(`event: smart-lock-bell-updated\ndata: ${JSON.stringify(poller.lastPayload)}\n\n`);
  }

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterSseStream(deviceId, res);
    res.end();

    const currentPoller = devicePollers.get(deviceId);
    if (currentPoller && currentPoller.subscribers.size === 0 && !sseStreams.get(deviceId)?.size) {
      stopDevicePoller(deviceId);
    }
  });
};
