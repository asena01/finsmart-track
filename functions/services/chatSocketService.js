import { Server } from 'socket.io';

let ioInstance = null;

const buildPayload = (chat, event = 'chat-updated', extra = {}) => ({
  event,
  chatId: chat._id?.toString?.() || chat._id,
  bookingId: chat.bookingId,
  vendorType: chat.vendorType,
  status: chat.status,
  updatedAt: chat.updatedAt || new Date(),
  ...extra
});

export const initializeChatSocket = (httpServer, corsOptions = {}) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      methods: corsOptions.methods || ['GET', 'POST'],
      credentials: corsOptions.credentials ?? true
    },
    path: '/socket.io'
  });

  ioInstance.on('connection', (socket) => {
    const { userId, vendorId } = socket.handshake.query;

    if (typeof userId === 'string' && userId) {
      socket.join(`customer:${userId}`);
    }

    if (typeof vendorId === 'string' && vendorId) {
      socket.join(`vendor:${vendorId}`);
    }

    socket.emit('connected', {
      event: 'connected',
      connectedAt: new Date().toISOString()
    });
  });

  return ioInstance;
};

export const emitChatUpdate = (chat, event = 'chat-updated', extra = {}) => {
  if (!ioInstance || !chat) {
    return;
  }

  const payload = buildPayload(chat, event, extra);
  const customerId = chat.customerId?.toString?.() || chat.customerId;
  const vendorId = chat.vendorId?.toString?.() || chat.vendorId;

  if (customerId) {
    ioInstance.to(`customer:${customerId}`).emit(event, payload);
  }

  if (vendorId) {
    ioInstance.to(`vendor:${vendorId}`).emit(event, payload);
  }
};

export const emitOrderUpdate = (order, event = 'order-updated', extra = {}) => {
  if (!ioInstance || !order) {
    return;
  }

  const payload = {
    event,
    orderId: order._id?.toString?.() || order._id,
    status: order.status,
    updatedAt: order.updatedAt || new Date(),
    readyAt: order.readyAt,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    ...extra
  };

  const getId = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
      return obj._id?.toString?.() || obj.id?.toString?.() || obj.toString?.();
    }
    return String(obj);
  };

  const customerId = getId(order.customerId || order.userId || order.guest);
  const vendorId = getId(order.restaurantId || order.vendorId || order.hotel);

  if (customerId) {
    ioInstance.to(`customer:${customerId}`).emit(event, payload);
  }

  if (vendorId) {
    ioInstance.to(`vendor:${vendorId}`).emit(event, payload);
  }
};
