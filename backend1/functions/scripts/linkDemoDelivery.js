import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryProviderService from '../models/DeliveryProviderService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://fingecsmarthotels:WhqTOg0rGPib0FvE@cluster0.nfxzw.mongodb.net/test';

const linkDemoDelivery = async () => {
  try {
    console.log('🔗 Linking demo delivery account with services...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find demo delivery user
    const demoUser = await User.findOne({ email: 'delivery@demo.com' });
    if (!demoUser) {
      console.error('❌ Demo delivery user not found');
      process.exit(1);
    }
    
    console.log('📝 Found demo user:', {
      id: demoUser._id,
      name: demoUser.name,
      email: demoUser.email,
      vendorType: demoUser.vendorType
    });

    // Check if delivery partner already exists for this user
    let deliveryPartner = await DeliveryPartner.findOne({ email: 'delivery@demo.com' });
    
    if (!deliveryPartner) {
      console.log('\n🚚 Creating DeliveryPartner for demo user...');
      deliveryPartner = await DeliveryPartner.create({
        name: demoUser.businessName || 'Demo Delivery Service',
        description: demoUser.businessDescription || 'A demo delivery service for testing',
        email: demoUser.email,
        phone: demoUser.phone,
        status: 'active',
        isVerified: true,
        serviceAreas: [
          {
            city: 'New York',
            state: 'NY',
            country: 'USA',
            radius: 30
          },
          {
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA',
            radius: 30
          }
        ],
        capabilities: {
          maxWeight: { value: 100, unit: 'kg' },
          maxItems: 200,
          availableVehicles: ['bike', 'car', 'truck'],
          refrigerated: true,
          fragileItemsHandling: true
        },
        standardDeliveryTime: { min: 1, max: 3, unit: 'hours' },
        expressDeliveryTime: { min: 30, max: 60, unit: 'minutes' },
        metrics: {
          onTimePercentage: 98,
          customerRating: 4.7,
          totalDeliveries: 0,
          successfulDeliveries: 0
        }
      });
      console.log('✅ Created DeliveryPartner:', deliveryPartner._id);
    } else {
      console.log('✅ DeliveryPartner already exists:', deliveryPartner._id);
    }

    // Store delivery partner ID in user's profile for reference
    demoUser.deliveryPartnerId = deliveryPartner._id;
    await demoUser.save();
    console.log('✅ Updated user with deliveryPartnerId\n');

    // Create demo services for this delivery partner
    console.log('📦 Creating demo services for delivery partner...');
    
    const demoServices = [
      {
        providerId: deliveryPartner._id,
        name: 'Quick Food Delivery',
        description: 'Fast delivery for restaurants and food businesses',
        category: 'food',
        basePrice: 5.00,
        perKmRate: 1.50,
        perKgRate: 0.50,
        estimatedDeliveryTime: 30,
        maxDistance: 25,
        maxWeight: 30,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: false,
          signature_required: false,
          scheduled_delivery: true
        },
        coverage: ['New York', 'Los Angeles'],
        isActive: true
      },
      {
        providerId: deliveryPartner._id,
        name: 'General Retail Delivery',
        description: 'Delivery service for retail goods and products',
        category: 'retail',
        basePrice: 3.50,
        perKmRate: 1.00,
        perKgRate: 0.30,
        estimatedDeliveryTime: 45,
        maxDistance: 30,
        maxWeight: 50,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: false,
          signature_required: false,
          scheduled_delivery: true
        },
        coverage: ['New York', 'Los Angeles'],
        isActive: true
      },
      {
        providerId: deliveryPartner._id,
        name: 'Furniture & Large Items',
        description: 'Delivery service for furniture and oversized items',
        category: 'furniture',
        basePrice: 20.00,
        perKmRate: 2.50,
        perKgRate: 1.50,
        estimatedDeliveryTime: 120,
        maxDistance: 40,
        maxWeight: 150,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: false,
          signature_required: true,
          scheduled_delivery: true
        },
        coverage: ['New York', 'Los Angeles'],
        isActive: true
      },
      {
        providerId: deliveryPartner._id,
        name: 'Temperature Controlled',
        description: 'Cold chain delivery for food, pharmacy, and perishables',
        category: 'perishable',
        basePrice: 8.00,
        perKmRate: 2.00,
        perKgRate: 1.00,
        estimatedDeliveryTime: 45,
        maxDistance: 25,
        maxWeight: 50,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: true,
          signature_required: true,
          scheduled_delivery: true
        },
        coverage: ['New York', 'Los Angeles'],
        isActive: true
      },
      {
        providerId: deliveryPartner._id,
        name: 'Express Packages',
        description: 'Fast package and document delivery',
        category: 'packages',
        basePrice: 4.00,
        perKmRate: 0.80,
        estimatedDeliveryTime: 20,
        maxDistance: 20,
        maxWeight: 10,
        features: {
          realTimeTracking: true,
          insurance: false,
          temperature_control: false,
          signature_required: true,
          scheduled_delivery: false
        },
        coverage: ['New York', 'Los Angeles'],
        isActive: true
      }
    ];

    const createdServices = await DeliveryProviderService.create(demoServices);
    console.log(`✅ Created ${createdServices.length} services\n`);

    // Print summary
    console.log('✅ Setup Summary:');
    console.log('================================');
    console.log(`Demo User Email: delivery@demo.com`);
    console.log(`Demo User ID: ${demoUser._id}`);
    console.log(`Delivery Partner ID: ${deliveryPartner._id}`);
    console.log(`Services Created: ${createdServices.length}`);
    console.log('================================\n');

    console.log('📝 Store this in frontend localStorage:');
    console.log(`deliveryId = "${deliveryPartner._id}"`);
    console.log(`OR login with delivery@demo.com / demo123456\n`);

    console.log('✅ Demo delivery account linked successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error linking demo delivery:', error);
    process.exit(1);
  }
};

linkDemoDelivery();
