import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// Create order
router.post('/', async (req, res) => {
  try {
    const { customer, items, totalAmount, paymentMethod, shippingAddress } = req.body;

    if (!customer || !items || !totalAmount || !paymentMethod || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const order = new Order({
      customer,
      items,
      totalAmount,
      paymentMethod,
      shippingAddress,
    });

    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('items.product', 'name price');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get customer orders by userId (modern endpoint)
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { type } = req.query;
    const customerId = req.params.customerId;

    console.log(`\n🔍 CUSTOMER ORDERS: Fetching for customerId: ${customerId}, type: ${type}`);

    // First, check ALL orders in database
    const allOrdersInDb = await Order.find({});
    console.log(`📊 Total orders in database: ${allOrdersInDb.length}`);
    if (allOrdersInDb.length > 0) {
      console.log('Sample order from DB:', JSON.stringify({
        orderId: allOrdersInDb[0].orderId,
        customer: allOrdersInDb[0].customer,
        userId: allOrdersInDb[0].userId,
        userEmail: allOrdersInDb[0].userEmail,
        itemsCount: allOrdersInDb[0].items ? allOrdersInDb[0].items.length : 0
      }, null, 2));
    }

    // First, check if ANY orders exist for this customer
    const allOrders = await Order.find({
      $or: [
        { customer: customerId },
        { userId: customerId }
      ]
    });
    console.log(`✅ Total orders found for this customer: ${allOrders.length}`);
    if (allOrders.length > 0) {
      console.log('Customer order details:', allOrders.map(o => ({
        orderId: o.orderId,
        customer: o.customer,
        userId: o.userId,
        customerEmail: o.customerEmail
      })));
    }

    // Build filter - support both customer ID and userId
    let filter = {
      $or: [
        { customer: customerId },
        { userId: customerId }
      ]
    };

    // Filter by service type if provided
    if (type) {
      filter['items.serviceType'] = type;
      console.log(`Filtering by serviceType: ${type}`);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 });

    // Note: Items are embedded in the order, no need to populate

    console.log(`✅ Returning ${orders.length} orders${type ? ` of type ${type}` : ''}\n`);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get vendor orders by vendorId
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const vendorId = req.params.vendorId;
    const skip = (page - 1) * limit;

    console.log(`\n🔍 VENDOR ORDERS: Fetching for vendorId: ${vendorId}, page: ${page}, limit: ${limit}, status: ${status}`);

    // First, check ALL orders to see what's in the database
    const allOrders = await Order.find({});
    console.log(`📊 Total orders in database: ${allOrders.length}`);
    if (allOrders.length > 0) {
      console.log('Sample order structure:', JSON.stringify(allOrders[0], null, 2).substring(0, 500));
    }

    // Build filter - find all orders that contain items from this vendor
    let filter = {
      'items.vendorId': vendorId
    };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Add search filter if provided (search by orderId or customerName)
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Filter being used:', JSON.stringify(filter));

    // Get total count
    let total = await Order.countDocuments(filter);
    console.log(`Found ${total} orders matching filter`);

    // If no orders found for this vendor, create demo orders
    if (total === 0) {
      console.log(`⚠️  No orders found for vendor ${vendorId}. Creating demo orders...`);

      const demoOrders = [
        {
          orderId: `ORD-${Date.now()}-001`,
          customerName: 'John Smith',
          customerEmail: 'john@example.com',
          status: 'processing',
          paymentStatus: 'completed',
          items: [
            {
              id: 'prod-001',
              name: 'Wireless Headphones',
              productName: 'Wireless Headphones',
              price: 5000,
              quantity: 1,
              subtotal: 5000,
              vendorId: vendorId,
              vendorName: 'Tech Store',
              serviceType: 'shopping'
            }
          ],
          subtotal: 5000,
          tax: 500,
          shippingCost: 1500,
          total: 7000
        },
        {
          orderId: `ORD-${Date.now()}-002`,
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah@example.com',
          status: 'shipped',
          paymentStatus: 'completed',
          items: [
            {
              id: 'prod-002',
              name: 'Smart Watch',
              productName: 'Smart Watch',
              price: 12000,
              quantity: 1,
              subtotal: 12000,
              vendorId: vendorId,
              vendorName: 'Tech Store',
              serviceType: 'shopping'
            },
            {
              id: 'prod-003',
              name: 'Phone Case',
              productName: 'Phone Case',
              price: 2000,
              quantity: 2,
              subtotal: 4000,
              vendorId: vendorId,
              vendorName: 'Tech Store',
              serviceType: 'shopping'
            }
          ],
          subtotal: 16000,
          tax: 1600,
          shippingCost: 2000,
          total: 19600
        },
        {
          orderId: `ORD-${Date.now()}-003`,
          customerName: 'Michael Chen',
          customerEmail: 'michael@example.com',
          status: 'delivered',
          paymentStatus: 'completed',
          items: [
            {
              id: 'prod-004',
              name: 'USB-C Cable',
              productName: 'USB-C Cable',
              price: 1500,
              quantity: 3,
              subtotal: 4500,
              vendorId: vendorId,
              vendorName: 'Tech Store',
              serviceType: 'shopping'
            }
          ],
          subtotal: 4500,
          tax: 450,
          shippingCost: 0,
          total: 4950,
          trackingNumber: 'TRK123456789'
        },
        {
          orderId: `ORD-${Date.now()}-004`,
          customerName: 'Emily Davis',
          customerEmail: 'emily@example.com',
          status: 'confirmed',
          paymentStatus: 'completed',
          items: [
            {
              id: 'prod-005',
              name: 'Laptop Stand',
              productName: 'Laptop Stand',
              price: 8000,
              quantity: 1,
              subtotal: 8000,
              vendorId: vendorId,
              vendorName: 'Tech Store',
              serviceType: 'shopping'
            },
            {
              id: 'prod-006',
              name: 'Wireless Keyboard',
              productName: 'Wireless Keyboard',
              price: 6000,
              quantity: 1,
              subtotal: 6000,
              vendorId: vendorId,
              vendorName: 'Tech Store',
              serviceType: 'shopping'
            }
          ],
          subtotal: 14000,
          tax: 1400,
          shippingCost: 1500,
          total: 16900
        },
        {
          orderId: `ORD-${Date.now()}-005`,
          customerName: 'Robert Wilson',
          customerEmail: 'robert@example.com',
          status: 'pending',
          paymentStatus: 'completed',
          items: [
            {
              id: 'prod-007',
              name: 'Monitor 27 inch',
              productName: 'Monitor 27 inch',
              price: 20000,
              quantity: 1,
              subtotal: 20000,
              vendorId: vendorId,
              vendorName: 'Tech Store',
              serviceType: 'shopping'
            }
          ],
          subtotal: 20000,
          tax: 2000,
          shippingCost: 2500,
          total: 24500
        }
      ];

      await Order.insertMany(demoOrders);
      total = demoOrders.length;
      console.log(`✅ Created ${total} demo orders for vendor ${vendorId}`);
    }

    // Get paginated orders
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`✅ Returning ${orders.length} vendor orders out of ${total} total`);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
      data: orders,
    });
  } catch (error) {
    console.error('❌ Error fetching vendor orders:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        ...(orderStatus && { orderStatus }),
        ...(paymentStatus && { paymentStatus }),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Demo: Create sample retail orders for testing
router.post('/demo/create-retail-orders', async (req, res) => {
  try {
    const RETAIL_STORE_ID = '69a7b2dbbed86e3e78c1c467';

    const demoOrders = [
      {
        orderId: `ORD-${Date.now()}-001`,
        customerName: 'John Smith',
        customerEmail: 'john@example.com',
        status: 'processing',
        paymentStatus: 'completed',
        items: [
          {
            id: 'prod-001',
            name: 'Wireless Headphones',
            productName: 'Wireless Headphones',
            price: 5000,
            quantity: 1,
            subtotal: 5000,
            vendorId: RETAIL_STORE_ID,
            vendorName: 'Tech Store',
            serviceType: 'shopping'
          }
        ],
        subtotal: 5000,
        tax: 500,
        shippingCost: 1500,
        total: 7000
      },
      {
        orderId: `ORD-${Date.now()}-002`,
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah@example.com',
        status: 'shipped',
        paymentStatus: 'completed',
        items: [
          {
            id: 'prod-002',
            name: 'Smart Watch',
            productName: 'Smart Watch',
            price: 12000,
            quantity: 1,
            subtotal: 12000,
            vendorId: RETAIL_STORE_ID,
            vendorName: 'Tech Store',
            serviceType: 'shopping'
          },
          {
            id: 'prod-003',
            name: 'Phone Case',
            productName: 'Phone Case',
            price: 2000,
            quantity: 2,
            subtotal: 4000,
            vendorId: RETAIL_STORE_ID,
            vendorName: 'Tech Store',
            serviceType: 'shopping'
          }
        ],
        subtotal: 16000,
        tax: 1600,
        shippingCost: 2000,
        total: 19600
      },
      {
        orderId: `ORD-${Date.now()}-003`,
        customerName: 'Michael Chen',
        customerEmail: 'michael@example.com',
        status: 'delivered',
        paymentStatus: 'completed',
        items: [
          {
            id: 'prod-004',
            name: 'USB-C Cable',
            productName: 'USB-C Cable',
            price: 1500,
            quantity: 3,
            subtotal: 4500,
            vendorId: RETAIL_STORE_ID,
            vendorName: 'Tech Store',
            serviceType: 'shopping'
          }
        ],
        subtotal: 4500,
        tax: 450,
        shippingCost: 0,
        total: 4950,
        trackingNumber: 'TRK123456789'
      },
      {
        orderId: `ORD-${Date.now()}-004`,
        customerName: 'Emily Davis',
        customerEmail: 'emily@example.com',
        status: 'confirmed',
        paymentStatus: 'completed',
        items: [
          {
            id: 'prod-005',
            name: 'Laptop Stand',
            productName: 'Laptop Stand',
            price: 8000,
            quantity: 1,
            subtotal: 8000,
            vendorId: RETAIL_STORE_ID,
            vendorName: 'Tech Store',
            serviceType: 'shopping'
          },
          {
            id: 'prod-006',
            name: 'Wireless Keyboard',
            productName: 'Wireless Keyboard',
            price: 6000,
            quantity: 1,
            subtotal: 6000,
            vendorId: RETAIL_STORE_ID,
            vendorName: 'Tech Store',
            serviceType: 'shopping'
          }
        ],
        subtotal: 14000,
        tax: 1400,
        shippingCost: 1500,
        total: 16900
      },
      {
        orderId: `ORD-${Date.now()}-005`,
        customerName: 'Robert Wilson',
        customerEmail: 'robert@example.com',
        status: 'pending',
        paymentStatus: 'completed',
        items: [
          {
            id: 'prod-007',
            name: 'Monitor 27 inch',
            productName: 'Monitor 27 inch',
            price: 20000,
            quantity: 1,
            subtotal: 20000,
            vendorId: RETAIL_STORE_ID,
            vendorName: 'Tech Store',
            serviceType: 'shopping'
          }
        ],
        subtotal: 20000,
        tax: 2000,
        shippingCost: 2500,
        total: 24500
      }
    ];

    const result = await Order.insertMany(demoOrders);

    console.log(`✅ Created ${result.length} demo retail orders`);

    res.status(201).json({
      success: true,
      message: `Created ${result.length} demo retail orders`,
      data: result
    });
  } catch (error) {
    console.error('Error creating demo orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Generate tracking number for order
router.post('/:orderId/tracking/generate', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { carrier, shippingMethod, estimatedDays } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Generate tracking number
    const trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (estimatedDays || 5));

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        trackingNumber,
        carrier: carrier || 'Standard Shipping',
        shippingMethod: shippingMethod || 'standard',
        estimatedDelivery,
        trackingCreatedAt: new Date(),
        status: 'shipped'
      },
      { new: true }
    );

    console.log(`✅ Tracking generated for order ${orderId}: ${trackingNumber}`);
    console.log(`   Estimated delivery: ${estimatedDelivery.toLocaleDateString()}`);

    res.status(200).json({
      success: true,
      message: 'Tracking number generated successfully',
      data: {
        orderId: updatedOrder.orderId,
        trackingNumber: updatedOrder.trackingNumber,
        carrier: updatedOrder.carrier,
        shippingMethod: updatedOrder.shippingMethod,
        estimatedDelivery: updatedOrder.estimatedDelivery,
        status: updatedOrder.status
      }
    });
  } catch (error) {
    console.error('Error generating tracking:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get tracking information by tracking number
router.get('/tracking/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const order = await Order.findOne({ trackingNumber });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Tracking number not found',
      });
    }

    // Calculate progress percentage
    const statusProgression = ['pending', 'processing', 'shipped', 'delivered'];
    const currentStatusIndex = statusProgression.indexOf(order.status);
    const progressPercent = ((currentStatusIndex + 1) / statusProgression.length) * 100;

    // Calculate days elapsed and remaining
    const createdDate = new Date(order.createdAt);
    const estimatedDate = order.estimatedDelivery || new Date(createdDate.getTime() + 5 * 24 * 60 * 60 * 1000);
    const today = new Date();

    const daysElapsed = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.floor((estimatedDate - today) / (1000 * 60 * 60 * 24)));

    res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        trackingNumber: order.trackingNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        carrier: order.carrier,
        shippingMethod: order.shippingMethod,
        createdDate: order.createdAt,
        estimatedDelivery: estimatedDate,
        actualDelivery: order.actualDelivery,
        progressPercent,
        daysElapsed,
        daysRemaining,
        items: order.items.map(item => ({
          name: item.name || item.productName,
          quantity: item.quantity,
          price: item.price
        })),
        total: order.total,
        shippingAddress: {
          name: order.customerName,
          address: order.customerAddress,
          email: order.customerEmail,
          phone: order.customerPhone
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get order tracking by order ID
router.get('/:orderId/tracking', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!order.trackingNumber) {
      return res.status(200).json({
        success: true,
        data: {
          hasTracking: false,
          message: 'Tracking information not yet available'
        }
      });
    }

    // Calculate progress percentage
    const statusProgression = ['pending', 'processing', 'shipped', 'delivered'];
    const currentStatusIndex = statusProgression.indexOf(order.status);
    const progressPercent = ((currentStatusIndex + 1) / statusProgression.length) * 100;

    // Build tracking timeline
    const timeline = [
      {
        status: 'pending',
        label: 'Order Placed',
        timestamp: order.createdAt,
        completed: true,
        description: 'Your order has been received'
      },
      {
        status: 'processing',
        label: 'Processing',
        timestamp: order.trackingCreatedAt,
        completed: currentStatusIndex >= 1,
        description: 'We are preparing your order for shipment'
      },
      {
        status: 'shipped',
        label: 'Shipped',
        timestamp: null,
        completed: currentStatusIndex >= 2,
        description: 'Your package is on its way'
      },
      {
        status: 'delivered',
        label: 'Delivered',
        timestamp: order.actualDelivery,
        completed: currentStatusIndex >= 3,
        description: 'Your order has been delivered'
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        hasTracking: true,
        orderId: order.orderId,
        trackingNumber: order.trackingNumber,
        status: order.status,
        carrier: order.carrier,
        shippingMethod: order.shippingMethod,
        progressPercent,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        timeline,
        customerName: order.customerName,
        customerAddress: order.customerAddress
      }
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update tracking status
router.put('/:orderId/tracking/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, carrier, location, actualDelivery } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: status || order.status,
        carrier: carrier || order.carrier,
        actualDelivery: actualDelivery || order.actualDelivery,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    console.log(`✅ Tracking status updated for order ${orderId}: ${status}`);

    res.status(200).json({
      success: true,
      message: 'Tracking status updated successfully',
      data: {
        trackingNumber: order.trackingNumber,
        status: order.status,
        actualDelivery: order.actualDelivery
      }
    });
  } catch (error) {
    console.error('Error updating tracking status:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
