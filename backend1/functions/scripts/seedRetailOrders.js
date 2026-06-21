import mongoose from 'mongoose';
import Order from '../models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

const RETAIL_STORE_ID = '69a7b2dbbed86e3e78c1c467'; // The retail store ID from logs

const demoOrders = [
  {
    orderId: `ORD-${Date.now()}-001`,
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    customerPhone: '+1234567890',
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
        vendorType: 'retail',
        serviceType: 'shopping'
      }
    ],
    subtotal: 5000,
    tax: 500,
    shippingCost: 1500,
    total: 7000,
    discount: 0
  },
  {
    orderId: `ORD-${Date.now()}-002`,
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah@example.com',
    customerPhone: '+1234567891',
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
        vendorType: 'retail',
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
        vendorType: 'retail',
        serviceType: 'shopping'
      }
    ],
    subtotal: 16000,
    tax: 1600,
    shippingCost: 2000,
    total: 19600,
    discount: 0
  },
  {
    orderId: `ORD-${Date.now()}-003`,
    customerName: 'Michael Chen',
    customerEmail: 'michael@example.com',
    customerPhone: '+1234567892',
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
        vendorType: 'retail',
        serviceType: 'shopping'
      }
    ],
    subtotal: 4500,
    tax: 450,
    shippingCost: 0,
    total: 4950,
    discount: 0,
    trackingNumber: 'TRK123456789'
  },
  {
    orderId: `ORD-${Date.now()}-004`,
    customerName: 'Emily Davis',
    customerEmail: 'emily@example.com',
    customerPhone: '+1234567893',
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
        vendorType: 'retail',
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
        vendorType: 'retail',
        serviceType: 'shopping'
      }
    ],
    subtotal: 14000,
    tax: 1400,
    shippingCost: 1500,
    total: 16900,
    discount: 0
  },
  {
    orderId: `ORD-${Date.now()}-005`,
    customerName: 'Robert Wilson',
    customerEmail: 'robert@example.com',
    customerPhone: '+1234567894',
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
        vendorType: 'retail',
        serviceType: 'shopping'
      }
    ],
    subtotal: 20000,
    tax: 2000,
    shippingCost: 2500,
    total: 24500,
    discount: 0
  }
];

async function seedRetailOrders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/markethub', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('📦 Seeding retail orders...');

    // Insert demo orders
    const result = await Order.insertMany(demoOrders);
    
    console.log(`✅ Successfully created ${result.length} demo retail orders`);
    console.log('📊 Orders created:');
    result.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.orderId} - ${order.customerName} (${order.status})`);
    });

    // Verify orders can be found by vendorId
    const foundOrders = await Order.find({ 'items.vendorId': RETAIL_STORE_ID });
    console.log(`\n🔍 Verification: Found ${foundOrders.length} orders for vendor ${RETAIL_STORE_ID}`);

    await mongoose.connection.close();
    console.log('\n✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding retail orders:', error);
    process.exit(1);
  }
}

seedRetailOrders();
