import Order from '../models/Order.js';
import Product from '../models/Product.js';

// Dummy API - simulates payment processing without Stripe

/**
 * Deduct inventory for ordered items
 */
async function deductInventory(items) {
  if (!items || items.length === 0) return;

  for (const item of items) {
    try {
      // Deduct inventory from product
      await Product.findByIdAndUpdate(
        item.id,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      console.log(`✅ Inventory updated: Product ${item.id} - ${item.quantity} units deducted`);
    } catch (error) {
      console.error(`❌ Failed to update inventory for product ${item.id}:`, error.message);
    }
  }
}

/**
 * Get product details with stock info
 */
async function getProductWithStock(productId) {
  try {
    return await Product.findById(productId).select('name price stock inStock');
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error.message);
    return null;
  }
}

// Create a dummy checkout session (Stripe replacement)
export const createCheckoutSession = async (req, res) => {
  try {
    const {
      items,
      customerEmail,
      customerName,
      customerPhone,
      customerAddress,
      subtotal,
      tax,
      total
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cart is empty'
      });
    }

    if (!customerEmail || !customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing customer information'
      });
    }

    // Generate dummy session ID and order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `dummy_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create order record
    const order = new Order({
      orderId,
      userId: req.body.userId,
      userEmail: customerEmail,
      customerName,
      customerPhone,
      customerAddress,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        vendorType: item.vendorType,
        serviceType: item.serviceType || 'shopping'
      })),
      subtotal,
      tax,
      total,
      paymentStatus: 'pending',
      paymentMethod: 'dummy',
      status: 'processing'
    });

    await order.save();

    console.log('✅ Dummy checkout session created:', {
      orderId,
      sessionId,
      customerEmail,
      total
    });

    return res.status(200).json({
      status: 'success',
      data: {
        sessionId: sessionId,
        orderId,
        url: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/payment-success?session_id=${sessionId}`
      },
      message: 'Checkout session created successfully'
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create checkout session'
    });
  }
};

// Get dummy session details
export const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Session ID is required'
      });
    }

    // For dummy API, just return mock data
    return res.status(200).json({
      status: 'success',
      data: {
        id: sessionId,
        paymentStatus: 'paid',
        customerEmail: 'customer@example.com',
        amountTotal: 9999,
        currency: 'NGN',
        clientReferenceId: 'order_dummy_123'
      }
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve session details'
    });
  }
};

// Handle dummy webhook (no actual webhook from Stripe)
export const handleWebhook = async (req, res) => {
  try {
    // For dummy API, just acknowledge the webhook
    console.log('📨 Dummy webhook received');
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get order details
export const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: order
    });
  } catch (error) {
    console.error('Error retrieving order:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve order'
    });
  }
};

// Get orders by email
export const getOrdersByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const orders = await Order.find({ userEmail: email })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Order.countDocuments({ userEmail: email });

    return res.status(200).json({
      status: 'success',
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve orders'
    });
  }
};

// Create dummy payment intent (Stripe replacement)
export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid amount'
      });
    }

    // Generate dummy client secret
    const clientSecret = `dummy_intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('💳 Dummy payment intent created:', {
      amount,
      email,
      clientSecret
    });

    return res.status(200).json({
      status: 'success',
      data: {
        clientSecret: clientSecret
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create payment intent'
    });
  }
};

// Process manual payments (credit card, debit card, bank transfer, mobile money)
export const processPayment = async (req, res) => {
  try {
    const {
      orderId,
      amount,
      currency,
      paymentMethod,
      cardDetails,
      bankDetails,
      mobileMoneyDetails,
      walletDetails,
      items,
      userId,
      userEmail,
      customerName,
      storeName
    } = req.body;

    // Validate required fields
    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required payment fields'
      });
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // For testing purposes, accept card/debit/bank/mobile payments
    // Log the payment details for verification
    console.log('✅ Processing payment:', {
      orderId,
      amount,
      currency: currency || 'NGN',
      paymentMethod,
      transactionId,
      userId,
      userEmail,
      timestamp: new Date().toISOString()
    });

    // Attempt to save order with cart items and customer info
    try {
      console.log('💾 Saving order with:');
      console.log('  - orderId:', orderId);
      console.log('  - customer (userId):', userId);
      console.log('  - userEmail:', userEmail);
      console.log('  - customerName:', customerName);
      console.log('  - items count:', items ? items.length : 0);
      if (items && items.length > 0) {
        console.log('  - first item vendorId:', items[0].vendorId);
        console.log('  - first item vendorName:', items[0].vendorName);
      }

      const order = new Order({
        orderId,
        customer: userId || null,  // Save as customer ID for customer service queries
        userId: userId || null,
        userEmail: userEmail || 'customer@example.com',
        customerName: customerName || 'Customer',
        customerPhone: '+1234567890',
        customerAddress: 'Delivery Address',
        items: items && items.length > 0 ? items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          vendorId: item.vendorId,  // Save vendor ID with each item
          vendorName: item.vendorName,
          vendorType: item.vendorType,
          serviceType: 'shopping'
        })) : [{
          id: 'cart-item',
          name: 'Shopping Purchase',
          price: amount,
          quantity: 1,
          category: 'Shopping',
          serviceType: 'shopping'
        }],
        subtotal: amount,
        tax: 0,
        total: amount,
        paymentStatus: 'completed',
        paymentMethod: 'card',
        status: 'processing',
        deliveryInfo: req.body.deliveryInfo  // Save delivery information
      });

      await order.save();
      console.log('✅ Order saved successfully:', orderId, 'for customer:', userId || userEmail);
      console.log('   Order ID in DB:', order._id);

      // Deduct inventory for purchased items
      console.log('📦 Deducting inventory for purchased items...');
      await deductInventory(items);

      console.log('✅ Inventory deduction completed');
    } catch (orderError) {
      // Log error but still return success for payment
      console.error('❌ Could not save order:', orderError.message);
      console.error('   Error details:', orderError);
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        transactionId: transactionId,
        orderId: orderId,
        amount: amount,
        currency: currency || 'NGN',
        paymentMethod: paymentMethod,
        status: 'completed'
      },
      message: 'Payment processed successfully'
    });
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
};

// Get available payment methods
export const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'credit_card',
        name: 'Credit Card',
        icon: '💳',
        description: 'Visa, Mastercard, Amex',
        type: 'card'
      },
      {
        id: 'debit_card',
        name: 'Debit Card',
        icon: '🏦',
        description: 'Bank Debit Card',
        type: 'card'
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        icon: '🏪',
        description: 'Direct bank transfer',
        type: 'bank'
      },
      {
        id: 'mobile_money',
        name: 'Mobile Money',
        icon: '📱',
        description: 'MTN, Airtel, Vodafone',
        type: 'mobile'
      },
      {
        id: 'wallet',
        name: 'Digital Wallet',
        icon: '💰',
        description: 'Use your wallet balance',
        type: 'wallet'
      }
    ];

    return res.status(200).json({
      status: 'success',
      success: true,
      data: paymentMethods,
      message: 'Payment methods retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving payment methods:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: error.message || 'Failed to retrieve payment methods'
    });
  }
};
