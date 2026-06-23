const customerOrderStreams = new Map();
const vendorOrderStreams = new Map();

const getId = (obj) => {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object') {
    return obj._id?.toString?.() || obj.id?.toString?.() || obj.toString?.();
  }
  return String(obj);
};

export const buildOrderUpdatePayload = (order, event = 'order-updated', extra = {}) => {
  const customerId = getId(order.customerId || order.userId || order.guest);
  const vendorId = getId(order.restaurantId || order.vendorId || order.hotel);

  return {
    event,
    orderId: order._id?.toString?.() || order._id,
    status: order.status,
    updatedAt: order.updatedAt || new Date(),
    readyAt: order.readyAt,
    etaAt: order.etaAt,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    estimatedDelivery: order.estimatedDelivery,
    estimatedDurationMinutes: order.estimatedDurationMinutes,
    orderedAt: order.orderedAt,
    orderTime: order.orderTime,
    customerId,
    vendorId,
    ...extra
  };
};

const registerStream = (registry, key, res) => {
  const streamKey = key?.toString?.() || String(key);
  const connections = registry.get(streamKey) || new Set();
  connections.add(res);
  registry.set(streamKey, connections);
};

const unregisterStream = (registry, key, res) => {
  const streamKey = key?.toString?.() || String(key);
  const connections = registry.get(streamKey);
  if (!connections) {
    return;
  }

  connections.delete(res);
  if (!connections.size) {
    registry.delete(streamKey);
  }
};

const pushStreamEvent = (registry, key, event, payload) => {
  const streamKey = key?.toString?.() || String(key);
  const connections = registry.get(streamKey);
  if (!connections?.size) {
    return;
  }

  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  const closedConnections = [];

  for (const res of connections) {
    try {
      res.write(data);
    } catch {
      closedConnections.push(res);
    }
  }

  for (const res of closedConnections) {
    connections.delete(res);
  }

  if (!connections.size) {
    registry.delete(streamKey);
  }
};

export const registerCustomerOrderStream = (userId, res) => {
  registerStream(customerOrderStreams, userId, res);
};

export const unregisterCustomerOrderStream = (userId, res) => {
  unregisterStream(customerOrderStreams, userId, res);
};

export const registerVendorOrderStream = (vendorId, res) => {
  registerStream(vendorOrderStreams, vendorId, res);
};

export const unregisterVendorOrderStream = (vendorId, res) => {
  unregisterStream(vendorOrderStreams, vendorId, res);
};

export const broadcastOrderSseUpdate = (order, event = 'order-updated', extra = {}) => {
  if (!order) {
    return null;
  }

  const payload = buildOrderUpdatePayload(order, event, extra);

  if (payload.customerId) {
    pushStreamEvent(customerOrderStreams, payload.customerId, event, payload);
  }

  if (payload.vendorId) {
    pushStreamEvent(vendorOrderStreams, payload.vendorId, event, payload);
  }

  return payload;
};
