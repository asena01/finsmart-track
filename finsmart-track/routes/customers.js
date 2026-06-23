import express from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Notification from '../models/Notification.js';
import VendorChat from '../models/VendorChat.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { emitChatUpdate } from '../services/chatSocketService.js';
import {
  registerCustomerOrderStream,
  registerVendorOrderStream,
  unregisterCustomerOrderStream,
  unregisterVendorOrderStream
} from '../services/orderRealtimeService.js';

const router = express.Router();
const customerChatStreams = new Map();
const vendorChatStreams = new Map();

const registerStream = (registry, key, res) => {
  const connections = registry.get(key) || new Set();
  connections.add(res);
  registry.set(key, connections);
};

const unregisterStream = (registry, key, res) => {
  const connections = registry.get(key);
  if (!connections) {
    return;
  }
  connections.delete(res);
  if (!connections.size) {
    registry.delete(key);
  }
};

const pushStreamEvent = (registry, key, event, payload) => {
  const connections = registry.get(key);
  if (!connections?.size) {
    return;
  }

  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of connections) {
    res.write(data);
  }
};

const broadcastChatUpdate = (chat, event = 'chat-updated', extra = {}) => {
  if (!chat) {
    return;
  }

  const chatId = chat._id?.toString?.() || chat._id;
  const customerId = chat.customerId?.toString?.() || chat.customerId;
  const vendorId = chat.vendorId?.toString?.() || chat.vendorId;
  const payload = {
    event,
    chatId,
    bookingId: chat.bookingId,
    vendorType: chat.vendorType,
    status: chat.status,
    unreadForCustomer: chat.unreadForCustomer || 0,
    unreadForVendor: chat.unreadForVendor || 0,
    updatedAt: chat.updatedAt || new Date(),
    ...extra
  };

  if (customerId) {
    pushStreamEvent(customerChatStreams, customerId, event, payload);
  }

  if (vendorId) {
    pushStreamEvent(vendorChatStreams, vendorId, event, payload);
  }

  emitChatUpdate(chat, event, extra);
};

const createChatNotification = async ({
  userId,
  businessId,
  businessType,
  title,
  message,
  relatedId
}) => {
  if (!userId || !businessId) {
    return;
  }

  try {
    await Notification.create({
      userId,
      businessId,
      businessType,
      type: 'system',
      title,
      message,
      priority: 'high',
      relatedId,
      relatedModel: 'VendorChat'
    });
  } catch (error) {
    console.error('❌ Error creating chat notification:', error);
  }
};

const enrichChatsWithBookingContext = async (chats = []) => {
  const bookingIds = [...new Set(
    chats
      .map((chat) => chat.bookingId)
      .filter((bookingId) => typeof bookingId === 'string' && mongoose.Types.ObjectId.isValid(bookingId))
  )];

  if (!bookingIds.length) {
    return chats;
  }

  const bookings = await Booking.find({ _id: { $in: bookingIds } })
    .populate('guest', 'name email phone')
    .populate('room', 'roomNumber roomType')
    .populate('hotel', 'name phone')
    .lean();

  const bookingMap = new Map(bookings.map((booking) => [booking._id.toString(), booking]));

  return chats.map((chat) => {
    const booking = chat.bookingId ? bookingMap.get(chat.bookingId.toString()) : null;
    return {
      ...chat,
      bookingContext: booking ? {
        bookingId: booking._id?.toString(),
        guestName: booking.guest?.name || 'Guest',
        guestEmail: booking.guest?.email || '',
        roomNumber: booking.room?.roomNumber || '',
        roomType: booking.room?.roomType || '',
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        hotelName: booking.hotel?.name || chat.vendorName || '',
        hotelPhone: booking.hotel?.phone || ''
      } : null
    };
  });
};

// Get business customers
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { businessType, page = 1, limit = 20, status, sortBy = 'recent', search } = req.query;
    const skip = (page - 1) * limit;

    let filter = { businessId };
    if (businessType) {
      filter.businessType = businessType;
    }
    if (status) {
      filter.status = status;
    }

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    let sort = { lastPurchaseDate: -1 };
    if (sortBy === 'spent') {
      sort = { totalSpent: -1 };
    } else if (sortBy === 'purchases') {
      sort = { totalPurchases: -1 };
    } else if (sortBy === 'joined') {
      sort = { createdAt: -1 };
    }

    const customers = await Customer.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(filter);

    // Calculate stats
    const stats = await Customer.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId),
          ...(businessType && { businessType }),
        },
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalRevenue: { $sum: '$totalSpent' },
          averageSpent: { $avg: '$totalSpent' },
          vipCount: {
            $sum: { $cond: [{ $eq: ['$status', 'vip'] }, 1, 0] },
          },
          activeCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', 'active'] },
                    { $eq: ['$status', 'vip'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: customers,
      stats: stats.length > 0 ? stats[0] : {},
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get top customers
router.get('/business/:businessId/top', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { businessType, limit = 10 } = req.query;

    let filter = { businessId };
    if (businessType) {
      filter.businessType = businessType;
    }

    const topCustomers = await Customer.find(filter)
      .sort({ totalSpent: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: topCustomers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create customer (usually auto-created on first order)
router.post('/', async (req, res) => {
  try {
    const {
      businessId,
      businessType,
      userId,
      name,
      email,
      phone,
      address,
    } = req.body;

    if (!businessId || !businessType || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      businessId,
      email,
      businessType,
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer already exists',
      });
    }

    const customer = new Customer({
      businessId,
      businessType,
      userId,
      name,
      email,
      phone,
      address,
      firstPurchaseDate: new Date(),
    });

    await customer.save();

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update customer
router.put('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const updates = req.body;

    // Don't allow direct updates to purchase stats
    delete updates.totalPurchases;
    delete updates.totalSpent;
    delete updates.averageOrderValue;

    const customer = await Customer.findByIdAndUpdate(customerId, updates, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update customer purchase stats (called after order)
router.put('/:customerId/purchases', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { orderAmount } = req.body;

    if (orderAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Order amount is required',
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    customer.totalPurchases += 1;
    customer.totalSpent += orderAmount;
    customer.averageOrderValue = customer.totalSpent / customer.totalPurchases;
    customer.lastPurchaseDate = new Date();

    // Mark as VIP if total spent > $1000
    if (customer.totalSpent > 1000 && customer.status === 'active') {
      customer.status = 'vip';
    }

    await customer.save();

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer stats updated',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete customer
router.delete('/:customerId', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== ORDER REAL-TIME ENDPOINTS ====================

router.get('/orders/stream', (req, res) => {
  const userId = (req.query.userId || req.headers['x-user-id'])?.toString?.();

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  registerCustomerOrderStream(userId, res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, scope: 'customer', userId })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterCustomerOrderStream(userId, res);
    res.end();
  });
});

router.get('/orders-by-vendor/:vendorId/stream', (req, res) => {
  const { vendorId } = req.params;
  const authVendorId = (req.query.vendorId || req.headers['x-vendor-id'])?.toString?.();

  if (!authVendorId || authVendorId !== vendorId) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You can only subscribe to your own orders'
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  registerVendorOrderStream(vendorId, res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, scope: 'vendor', vendorId })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterVendorOrderStream(vendorId, res);
    res.end();
  });
});

// ==================== VENDOR CHAT ENDPOINTS ====================

router.get('/vendor-chats/stream', (req, res) => {
  const userId = req.query.userId || req.headers['x-user-id'];

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  registerStream(customerChatStreams, userId.toString(), res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, scope: 'customer', userId })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterStream(customerChatStreams, userId.toString(), res);
    res.end();
  });
});

router.get('/vendor-chats-by-vendor/:vendorId/stream', (req, res) => {
  const { vendorId } = req.params;
  const authVendorId = req.query.vendorId || req.headers['x-vendor-id'];

  if (!authVendorId || authVendorId !== vendorId) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You can only subscribe to your own chats'
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  registerStream(vendorChatStreams, vendorId.toString(), res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, scope: 'vendor', vendorId })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterStream(vendorChatStreams, vendorId.toString(), res);
    res.end();
  });
});

// Get all vendor chats for current user
router.get('/vendor-chats', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const chats = await VendorChat.find({ customerId: userId })
      .sort({ updatedAt: -1 })
      .lean();

    const enrichedChats = await enrichChatsWithBookingContext(chats);

    res.status(200).json({
      success: true,
      data: enrichedChats
    });
  } catch (error) {
    console.error('❌ Error fetching vendor chats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start or get existing vendor chat
router.post('/vendor-chats', async (req, res) => {
  try {
    const { vendorType, bookingId, vendorName } = req.body;
    const userId = req.query.userId || req.headers['x-user-id'] || req.body.userId;

    if (!userId || !vendorType || !vendorName) {
      return res.status(400).json({
        success: false,
        message: 'User ID, vendor type, and vendor name are required'
      });
    }

    let resolvedVendorId = `vendor-${Date.now()}`;
    let resolvedVendorName = vendorName;

    if (vendorType === 'hotel' && bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      const booking = await Booking.findById(bookingId).populate('hotel', 'name');
      if (booking?.hotel) {
        const hotel = booking.hotel;
        resolvedVendorId = hotel._id?.toString() || hotel.toString();
        resolvedVendorName = hotel.name || vendorName;
      }
    }

    // Check if chat already exists for this booking/order
    let chat = null;
    if (bookingId) {
      chat = await VendorChat.findOne({
        customerId: userId,
        bookingId: bookingId,
        vendorType
      });
    }

    if (!chat) {
      // Create new chat
      chat = new VendorChat({
        customerId: userId,
        bookingId: bookingId,
        vendorId: resolvedVendorId,
        vendorName: resolvedVendorName,
        vendorType,
        unreadForCustomer: 0,
        unreadForVendor: 0,
        subject: vendorType === 'hotel'
          ? `Hotel stay support`
          : `Chat about ${vendorType} ${bookingId ? 'booking' : 'order'}`,
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            sender: 'vendor',
            senderName: resolvedVendorName,
            message: `Hello! How can I help you with your ${vendorType} booking/order?`,
            timestamp: new Date(),
            read: false
          }
        ]
      });

      await chat.save();
      console.log('✅ New vendor chat created:', chat._id);
    } else {
      if (vendorType === 'hotel') {
        chat.vendorId = resolvedVendorId;
        chat.vendorName = resolvedVendorName;
      }
      // Mark chat as open if it was closed
      chat.status = 'open';
      await chat.save();
      console.log('✅ Existing vendor chat opened:', chat._id);
    }

    res.status(chat.isNew ? 201 : 200).json({
      success: true,
      data: (await enrichChatsWithBookingContext([chat.toObject ? chat.toObject() : chat]))[0],
      message: chat.isNew ? 'Chat created successfully' : 'Chat opened successfully'
    });

    broadcastChatUpdate(chat, chat.isNew ? 'chat-created' : 'chat-opened');
  } catch (error) {
    console.error('❌ Error creating/opening vendor chat:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send message in vendor chat (CUSTOMER-SIDE)
router.post('/vendor-chats/:chatId/message', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    const chat = await VendorChat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is authorized
    if (chat.customerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to message this chat'
      });
    }

    const customer = mongoose.Types.ObjectId.isValid(userId)
      ? await User.findById(userId).select('name')
      : null;

    const newMessage = {
      _id: new mongoose.Types.ObjectId(),
      sender: 'customer',
      senderName: customer?.name || 'Customer',
      message: message.trim(),
      timestamp: new Date(),
      read: false
    };

    chat.messages.push(newMessage);
    chat.updatedAt = new Date();
    chat.unreadForVendor = (chat.unreadForVendor || 0) + 1;
    chat.unreadForCustomer = 0;
    chat.lastReadAtCustomer = new Date();
    await chat.save();

    console.log('✅ Message sent in chat:', chatId);

    broadcastChatUpdate(chat, 'message-created', {
      chatId: chat._id?.toString?.() || chat._id,
      messageId: newMessage._id?.toString?.() || newMessage._id
    });

    res.status(201).json({
      success: true,
      data: newMessage,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============ VENDOR-SIDE CHAT ENDPOINTS ============

// Get chats for a vendor (VENDOR-SIDE)
router.get('/vendor-chats-by-vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { vendorType, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Validate vendor authorization
    const authVendorId = req.headers['x-vendor-id'] || req.query.vendorId;
    if (!authVendorId || authVendorId !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only view your own chats'
      });
    }

    let filter = { vendorId };
    if (vendorType) {
      filter.vendorType = vendorType;
    }

    if (vendorType === 'hotel' && mongoose.Types.ObjectId.isValid(vendorId)) {
      const hotelBookings = await Booking.find({ hotel: vendorId }).select('_id').lean();
      const bookingIds = hotelBookings.map((booking) => booking._id.toString());
      filter = {
        vendorType: 'hotel',
        $or: [
          { vendorId },
          ...(bookingIds.length ? [{ bookingId: { $in: bookingIds } }] : [])
        ]
      };
    }

    const chats = await VendorChat.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await VendorChat.countDocuments(filter);

    const enrichedChats = await enrichChatsWithBookingContext(chats);

    console.log(`✅ Fetched ${enrichedChats.length} chats for vendor ${vendorId}`);

    res.status(200).json({
      success: true,
      data: enrichedChats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching vendor chats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send vendor reply in chat (VENDOR-SIDE)
router.post('/vendor-chats/:chatId/vendor-reply', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, vendorName } = req.body;
    const vendorId = req.headers['x-vendor-id'] || req.query.vendorId;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const chat = await VendorChat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    let isAuthorizedVendor = chat.vendorId === vendorId;

    if (!isAuthorizedVendor && chat.vendorType === 'hotel' && chat.bookingId && mongoose.Types.ObjectId.isValid(vendorId)) {
      const booking = await Booking.findById(chat.bookingId).select('hotel');
      if (booking?.hotel?.toString() === vendorId.toString()) {
        isAuthorizedVendor = true;
        chat.vendorId = vendorId.toString();
        if (vendorName) {
          chat.vendorName = vendorName;
        }
      }
    }

    // Verify vendor authorization
    if (!isAuthorizedVendor) {
      console.warn('⚠️ Unauthorized vendor reply attempt:', { vendorId, chatVendorId: chat.vendorId, bookingId: chat.bookingId });
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: This chat does not belong to you'
      });
    }

    // Prevent replies to closed chats
    if (chat.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to a closed chat'
      });
    }

    const newMessage = {
      _id: new mongoose.Types.ObjectId(),
      sender: 'vendor',
      senderName: vendorName || chat.vendorName,
      message: message.trim(),
      timestamp: new Date(),
      read: false
    };

    chat.messages.push(newMessage);
    chat.updatedAt = new Date();
    chat.unreadForCustomer = (chat.unreadForCustomer || 0) + 1;
    chat.unreadForVendor = 0;
    chat.lastReadAtVendor = new Date();
    await chat.save();

    console.log(`✅ Vendor reply sent in chat ${chatId}`);

    broadcastChatUpdate(chat, 'message-created', {
      chatId: chat._id?.toString?.() || chat._id,
      messageId: newMessage._id?.toString?.() || newMessage._id
    });

    await createChatNotification({
      userId: chat.customerId,
      businessId: chat.vendorId,
      businessType: chat.vendorType,
      title: `${vendorName || chat.vendorName} replied`,
      message: message.trim(),
      relatedId: chat._id
    });

    res.status(201).json({
      success: true,
      data: newMessage,
      message: 'Reply sent successfully'
    });
  } catch (error) {
    console.error('❌ Error sending vendor reply:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.put('/vendor-chats/:chatId/read-customer', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.query.userId || req.headers['x-user-id'];
    const chat = await VendorChat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    if (chat.customerId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this chat' });
    }

    chat.unreadForCustomer = 0;
    chat.lastReadAtCustomer = new Date();
    await chat.save();

    broadcastChatUpdate(chat, 'chat-opened');

    return res.status(200).json({ success: true, data: chat, message: 'Customer chat marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/vendor-chats/:chatId/read-vendor', async (req, res) => {
  try {
    const { chatId } = req.params;
    const vendorId = req.headers['x-vendor-id'] || req.query.vendorId;
    const chat = await VendorChat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    let isAuthorizedVendor = chat.vendorId === vendorId;
    if (!isAuthorizedVendor && chat.vendorType === 'hotel' && chat.bookingId && mongoose.Types.ObjectId.isValid(vendorId)) {
      const booking = await Booking.findById(chat.bookingId).select('hotel');
      if (booking?.hotel?.toString() === vendorId.toString()) {
        isAuthorizedVendor = true;
      }
    }

    if (!isAuthorizedVendor) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this chat' });
    }

    chat.unreadForVendor = 0;
    chat.lastReadAtVendor = new Date();
    await chat.save();

    broadcastChatUpdate(chat, 'chat-opened');

    return res.status(200).json({ success: true, data: chat, message: 'Vendor chat marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get single customer
router.get('/:customerId', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
