import { Server } from 'socket.io';
import {
  broadcastOrderSseUpdate,
  buildOrderUpdatePayload
} from './orderRealtimeService.js';

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
  if (!order) {
    return;
  }

  broadcastOrderSseUpdate(order, event, extra);

  if (!ioInstance) {
    return;
  }

  const payload = buildOrderUpdatePayload(order, event, extra);
  const customerId = payload.customerId;
  const vendorId = payload.vendorId;

  if (customerId) {
    ioInstance.to(`customer:${customerId}`).emit(event, payload);
  }

  if (vendorId) {
    ioInstance.to(`vendor:${vendorId}`).emit(event, payload);
  }
};
