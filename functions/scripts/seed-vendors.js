import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import VendorPerformance from '../models/VendorPerformance.js';
import * as dotenv from 'dotenv';

dotenv.config();

const vendorData = [
  // Hotels
  {
    name: 'Luxury Grand Hotel',
    email: 'luxury@grandhospitality.com',
    password: 'password123',
    phone: '+234-801-234-5001',
    userType: 'vendor',
    vendorType: 'hotel',
    businessName: 'Luxury Grand Hotel',
    businessDescription: 'A premium 5-star hotel with world-class amenities',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'Comfort Inn Resort',
    email: 'info@comfortinn.com',
    password: 'password123',
    phone: '+234-802-234-5002',
    userType: 'vendor',
    vendorType: 'hotel',
    businessName: 'Comfort Inn Resort',
    businessDescription: 'Affordable 3-star hotel with family-friendly services',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'Beach Paradise Hotel',
    email: 'beach@paradisehotel.com',
    password: 'password123',
    phone: '+234-803-234-5003',
    userType: 'vendor',
    vendorType: 'hotel',
    businessName: 'Beach Paradise Hotel',
    businessDescription: 'Beachfront resort with water sports facilities',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  // Restaurants
  {
    name: 'Fine Dining Restaurant',
    email: 'fine@diningrestaurant.com',
    password: 'password123',
    phone: '+234-804-234-5004',
    userType: 'vendor',
    vendorType: 'restaurant',
    businessName: 'Fine Dining Restaurant',
    businessDescription: 'Upscale restaurant serving international cuisine',
    businessImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23FF6B35" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3EFine Dining%3C/text%3E%3C/svg%3E',
    cuisineType: ['French', 'International'],
    address: '123 Upscale Street, Downtown',
    city: 'Lagos',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'Taste of Africa',
    email: 'taste@africarestaurant.com',
    password: 'password123',
    phone: '+234-805-234-5005',
    userType: 'vendor',
    vendorType: 'restaurant',
    businessName: 'Taste of Africa',
    businessDescription: 'Traditional African dishes with modern twist',
    businessImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23F4A261" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3ETaste Africa%3C/text%3E%3C/svg%3E',
    cuisineType: ['African', 'Nigerian'],
    address: '456 Heritage Avenue, Lekki',
    city: 'Lagos',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'Quick Bites Cafe',
    email: 'bites@quickcafe.com',
    password: 'password123',
    phone: '+234-806-234-5006',
    userType: 'vendor',
    vendorType: 'restaurant',
    businessName: 'Quick Bites Cafe',
    businessDescription: 'Fast casual restaurant with healthy options',
    businessImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%232A9D8F" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial"%3EQuick Bites%3C/text%3E%3C/svg%3E',
    cuisineType: ['Fast Food', 'Healthy'],
    address: '789 Quick Lane, VI',
    city: 'Lagos',
    isVerified: false,
    status: 'pending',
    kycStatus: 'pending'
  },
  // Retail Stores
  {
    name: 'Fashion Forward Boutique',
    email: 'fashion@forwardboutique.com',
    password: 'password123',
    phone: '+234-807-234-5007',
    userType: 'vendor',
    vendorType: 'retail',
    businessName: 'Fashion Forward Boutique',
    businessDescription: 'Trendy clothing and accessories store',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'Electronics Hub',
    email: 'tech@electronicshub.com',
    password: 'password123',
    phone: '+234-808-234-5008',
    userType: 'vendor',
    vendorType: 'retail',
    businessName: 'Electronics Hub',
    businessDescription: 'Latest gadgets and electronic devices',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  // Services
  {
    name: 'ProTech Solutions',
    email: 'tech@protech-solutions.com',
    password: 'password123',
    phone: '+234-809-234-5009',
    userType: 'vendor',
    vendorType: 'service',
    businessName: 'ProTech Solutions',
    businessDescription: 'IT and software development services',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'Beauty & Wellness Spa',
    email: 'beauty@wellnessspa.com',
    password: 'password123',
    phone: '+234-810-234-5010',
    userType: 'vendor',
    vendorType: 'service',
    businessName: 'Beauty & Wellness Spa',
    businessDescription: 'Full-service spa with beauty treatments',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  // Tours
  {
    name: 'Safari Adventures',
    email: 'safari@adventures.com',
    password: 'password123',
    phone: '+234-811-234-5011',
    userType: 'vendor',
    vendorType: 'tour-operator',
    businessName: 'Safari Adventures',
    businessDescription: 'Exciting wildlife safari tours',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'City Tours Guide',
    email: 'city@toursguide.com',
    password: 'password123',
    phone: '+234-812-234-5012',
    userType: 'vendor',
    vendorType: 'tour-operator',
    businessName: 'City Tours Guide',
    businessDescription: 'Guided city sightseeing tours',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  // Delivery
  {
    name: 'Swift Delivery Co',
    email: 'swift@deliveryco.com',
    password: 'password123',
    phone: '+234-813-234-5013',
    userType: 'vendor',
    vendorType: 'delivery',
    businessName: 'Swift Delivery Co',
    businessDescription: 'Fast and reliable delivery service',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  },
  {
    name: 'Express Logistics',
    email: 'express@logistics.com',
    password: 'password123',
    phone: '+234-814-234-5014',
    userType: 'vendor',
    vendorType: 'delivery',
    businessName: 'Express Logistics',
    businessDescription: 'Professional logistics and courier services',
    isVerified: true,
    status: 'active',
    kycStatus: 'approved'
  }
];

async function seedVendors() {
  try {
    // Use the same MongoDB connection as the server
    const mongoUrl = 'mongodb+srv://fingecsmarthotels:WhqTOg0rGPib0FvE@cluster0.nfxzw.mongodb.net/test';

    console.log('\n🔗 Connecting to MongoDB...');
    console.log(`📍 Database: ${mongoUrl.split('/').pop() || 'test'}`);

    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Clear existing vendors
    const deleteResult = await User.deleteMany({ userType: 'vendor' });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing vendors`);

    // Hash passwords and insert vendors one by one
    const createdVendors = [];
    for (const vendorInfo of vendorData) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(vendorInfo.password, salt);

      const vendor = new User({
        ...vendorInfo,
        password: hashedPassword
      });

      await vendor.save();
      createdVendors.push(vendor);
    }
    console.log(`✅ Created ${createdVendors.length} test vendors`);

    // Create performance records for each vendor
    for (const vendor of createdVendors) {
      const performance = new VendorPerformance({
        vendor: vendor._id,
        revenue: {
          thisMonth: Math.floor(Math.random() * 100000) + 10000,
          lastMonth: Math.floor(Math.random() * 100000) + 5000,
          total: Math.floor(Math.random() * 500000) + 50000
        },
        rating: {
          average: parseFloat((Math.random() * 5 * 0.7 + 2.5).toFixed(2)),
          count: Math.floor(Math.random() * 500)
        },
        bookings: {
          total: Math.floor(Math.random() * 1000),
          completed: Math.floor(Math.random() * 800),
          pending: Math.floor(Math.random() * 50)
        },
        reviews: {
          total: Math.floor(Math.random() * 200),
          positive: Math.floor(Math.random() * 150),
          negative: Math.floor(Math.random() * 20)
        }
      });
      await performance.save();
    }

    console.log('✅ Created performance records for all vendors');
    console.log('\n📋 Sample Vendors Created:');
    console.log('==============================');
    createdVendors.forEach(v => {
      console.log(`  • ${v.businessName} (${v.vendorType}) - ${v.email}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding vendors:', error);
    process.exit(1);
  }
}

seedVendors();
