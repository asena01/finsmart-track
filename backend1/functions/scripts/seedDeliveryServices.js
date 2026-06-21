import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryProviderService from '../models/DeliveryProviderService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://fingecsmarthotels:WhqTOg0rGPib0FvE@cluster0.nfxzw.mongodb.net/test';

const seedDeliveryServices = async () => {
  try {
    console.log('🌱 Starting delivery services seeding...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing delivery services
    console.log('🗑️  Clearing existing delivery provider services...');
    await DeliveryProviderService.deleteMany({});
    console.log('✅ Cleared existing services');

    // Create sample delivery providers
    console.log('🚚 Creating delivery providers...');
    
    const providers = await DeliveryPartner.create([
      {
        name: 'FastDelivery Pro',
        description: 'Fast and reliable delivery service covering food, retail, and packages',
        email: 'contact@fastdeliverypro.com',
        phone: '+1-800-FAST-123',
        status: 'active',
        isVerified: true,
        serviceAreas: [
          {
            city: 'New York',
            state: 'NY',
            country: 'USA',
            radius: 25
          },
          {
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA',
            radius: 30
          }
        ],
        capabilities: {
          maxWeight: { value: 50, unit: 'kg' },
          maxItems: 100,
          availableVehicles: ['bike', 'car', 'truck'],
          refrigerated: true,
          fragileItemsHandling: true
        },
        standardDeliveryTime: { min: 1, max: 3, unit: 'hours' },
        expressDeliveryTime: { min: 30, max: 60, unit: 'minutes' },
        metrics: {
          onTimePercentage: 97,
          customerRating: 4.8,
          totalDeliveries: 5000,
          successfulDeliveries: 4850
        }
      },
      {
        name: 'Express Courier Network',
        description: 'Premium delivery service for furniture, electronics, and fragile items',
        email: 'info@expresscourier.com',
        phone: '+1-888-EXPRESS',
        status: 'active',
        isVerified: true,
        serviceAreas: [
          {
            city: 'Chicago',
            state: 'IL',
            country: 'USA',
            radius: 20
          },
          {
            city: 'Houston',
            state: 'TX',
            country: 'USA',
            radius: 25
          }
        ],
        capabilities: {
          maxWeight: { value: 200, unit: 'kg' },
          maxItems: 50,
          availableVehicles: ['truck', 'van'],
          refrigerated: false,
          fragileItemsHandling: true
        },
        standardDeliveryTime: { min: 2, max: 4, unit: 'hours' },
        expressDeliveryTime: { min: 1, max: 2, unit: 'hours' },
        metrics: {
          onTimePercentage: 95,
          customerRating: 4.6,
          totalDeliveries: 3000,
          successfulDeliveries: 2850
        }
      },
      {
        name: 'ColdChain Logistics',
        description: 'Specialized in temperature-controlled deliveries for food, pharmacy, and perishables',
        email: 'support@coldchainlogistics.com',
        phone: '+1-877-COLD-123',
        status: 'active',
        isVerified: true,
        serviceAreas: [
          {
            city: 'Miami',
            state: 'FL',
            country: 'USA',
            radius: 30
          },
          {
            city: 'Phoenix',
            state: 'AZ',
            country: 'USA',
            radius: 28
          }
        ],
        capabilities: {
          maxWeight: { value: 100, unit: 'kg' },
          maxItems: 200,
          availableVehicles: ['car', 'van'],
          refrigerated: true,
          fragileItemsHandling: false
        },
        standardDeliveryTime: { min: 1, max: 2, unit: 'hours' },
        expressDeliveryTime: { min: 30, max: 45, unit: 'minutes' },
        metrics: {
          onTimePercentage: 99,
          customerRating: 4.9,
          totalDeliveries: 7000,
          successfulDeliveries: 6930
        }
      }
    ]);

    console.log('✅ Created delivery providers:', providers.map(p => ({ id: p._id, name: p.name })));

    // Create sample services for each provider
    console.log('\n📦 Creating delivery services...');

    const services = [
      // FastDelivery Pro Services
      {
        providerId: providers[0]._id,
        name: 'Express Food Delivery',
        description: 'Fast delivery for restaurants, ideal for hot food items',
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
        providerId: providers[0]._id,
        name: 'Retail Shop Delivery',
        description: 'General retail goods delivery service',
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
        providerId: providers[0]._id,
        name: 'Quick Package Delivery',
        description: 'Small packages and documents',
        category: 'packages',
        basePrice: 4.00,
        perKmRate: 0.80,
        estimatedDeliveryTime: 20,
        maxDistance: 20,
        maxWeight: 5,
        features: {
          realTimeTracking: true,
          insurance: false,
          temperature_control: false,
          signature_required: true,
          scheduled_delivery: false
        },
        coverage: ['New York', 'Los Angeles'],
        isActive: true
      },

      // Express Courier Network Services
      {
        providerId: providers[1]._id,
        name: 'Premium Furniture Delivery',
        description: 'White-glove furniture delivery service with assembly',
        category: 'furniture',
        basePrice: 25.00,
        perKmRate: 3.00,
        perKgRate: 2.00,
        estimatedDeliveryTime: 120,
        maxDistance: 50,
        maxWeight: 200,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: false,
          signature_required: true,
          scheduled_delivery: true
        },
        coverage: ['Chicago', 'Houston'],
        isActive: true
      },
      {
        providerId: providers[1]._id,
        name: 'Electronics Safe Delivery',
        description: 'Secure delivery for electronics and fragile items',
        category: 'packages',
        basePrice: 10.00,
        perKmRate: 2.00,
        perKgRate: 1.50,
        estimatedDeliveryTime: 60,
        maxDistance: 40,
        maxWeight: 100,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: false,
          signature_required: true,
          scheduled_delivery: true
        },
        coverage: ['Chicago', 'Houston'],
        isActive: true
      },
      {
        providerId: providers[1]._id,
        name: 'Business Courier',
        description: 'Document and business goods courier service',
        category: 'packages',
        basePrice: 6.00,
        perKmRate: 1.20,
        estimatedDeliveryTime: 45,
        maxDistance: 35,
        maxWeight: 25,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: false,
          signature_required: true,
          scheduled_delivery: false
        },
        coverage: ['Chicago', 'Houston'],
        isActive: true
      },

      // ColdChain Logistics Services
      {
        providerId: providers[2]._id,
        name: 'Cold Food Delivery',
        description: 'Temperature-controlled delivery for food and groceries',
        category: 'food',
        basePrice: 8.00,
        perKmRate: 2.00,
        perKgRate: 1.00,
        estimatedDeliveryTime: 45,
        maxDistance: 30,
        maxWeight: 50,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: true,
          signature_required: false,
          scheduled_delivery: true
        },
        coverage: ['Miami', 'Phoenix'],
        isActive: true
      },
      {
        providerId: providers[2]._id,
        name: 'Pharmacy Safe Delivery',
        description: 'Secure and temperature-controlled pharmacy deliveries',
        category: 'pharmacy',
        basePrice: 6.00,
        perKmRate: 1.50,
        perKgRate: 0.75,
        estimatedDeliveryTime: 30,
        maxDistance: 25,
        maxWeight: 20,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: true,
          signature_required: true,
          scheduled_delivery: true
        },
        coverage: ['Miami', 'Phoenix'],
        isActive: true
      },
      {
        providerId: providers[2]._id,
        name: 'Premium Grocery Delivery',
        description: 'Fresh grocery items with temperature monitoring',
        category: 'grocery',
        basePrice: 5.50,
        perKmRate: 1.20,
        perKgRate: 0.50,
        estimatedDeliveryTime: 40,
        maxDistance: 28,
        maxWeight: 60,
        features: {
          realTimeTracking: true,
          insurance: false,
          temperature_control: true,
          signature_required: false,
          scheduled_delivery: true
        },
        coverage: ['Miami', 'Phoenix'],
        isActive: true
      },
      {
        providerId: providers[2]._id,
        name: 'Perishable Goods Delivery',
        description: 'Specialized service for perishable items with strict temperature control',
        category: 'perishable',
        basePrice: 10.00,
        perKmRate: 2.50,
        perKgRate: 1.50,
        estimatedDeliveryTime: 60,
        maxDistance: 35,
        maxWeight: 40,
        features: {
          realTimeTracking: true,
          insurance: true,
          temperature_control: true,
          signature_required: true,
          scheduled_delivery: true
        },
        coverage: ['Miami', 'Phoenix'],
        isActive: true
      }
    ];

    const createdServices = await DeliveryProviderService.create(services);
    console.log(`✅ Created ${createdServices.length} delivery services`);

    // Print summary
    console.log('\n📊 Seeding Summary:');
    console.log('================================');
    console.log(`Delivery Providers: ${providers.length}`);
    providers.forEach(p => {
      const providerServices = createdServices.filter(s => s.providerId.toString() === p._id.toString());
      console.log(`  • ${p.name} (${providerServices.length} services)`);
    });
    console.log(`Total Services: ${createdServices.length}`);
    console.log('================================\n');

    // Print service details by category
    console.log('📋 Services by Category:');
    const categories = [...new Set(createdServices.map(s => s.category))];
    categories.forEach(cat => {
      const catServices = createdServices.filter(s => s.category === cat);
      console.log(`  ${cat.toUpperCase()}: ${catServices.length} services`);
    });

    console.log('\n✅ Delivery services seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding delivery services:', error);
    process.exit(1);
  }
};

seedDeliveryServices();
