#!/usr/bin/env node

/**
 * Simple Seed Data Script
 * Run: node seed-data.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB Connection String
const MONGO_URI = 'mongodb+srv://fingecsmarthotels:WhqTOg0rGPib0FvE@cluster0.nfxzw.mongodb.net/test';

// Define User Schema inline
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, sparse: true },
    password: String,
    phone: String,
    userType: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'customer' },
    vendorType: String,
    businessName: String,
    businessDescription: String,
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'verified', 'active', 'suspended', 'blocked'], default: 'pending' },
    kycStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Vendor Performance Schema
const vendorPerformanceSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revenue: {
      thisMonth: { type: Number, default: 0 },
      lastMonth: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    bookings: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 }
    },
    reviews: {
      total: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 }
    },
    performanceLevel: { type: String, default: 'standard' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const VendorPerformance = mongoose.model('VendorPerformance', vendorPerformanceSchema);

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

async function seedData() {
  try {
    console.log('\n════════════════════════════════════════');
    console.log('  🌱 SEEDING TEST VENDOR DATA');
    console.log('════════════════════════════════════════\n');

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Delete existing vendors
    console.log('🗑️  Cleaning up existing vendors...');
    const deleteResult = await User.deleteMany({ userType: 'vendor' });
    console.log(`   Deleted: ${deleteResult.deletedCount} vendors\n`);

    // Create vendors
    console.log('👥 Creating vendors...');
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
      console.log(`   ✓ ${vendor.businessName} (${vendor.vendorType})`);
    }
    console.log(`\n✅ Created ${createdVendors.length} vendors\n`);

    // Create performance records
    console.log('📊 Creating performance records...');
    let performanceCount = 0;
    
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
      performanceCount++;
    }
    console.log(`✅ Created ${performanceCount} performance records\n`);

    // Summary
    console.log('════════════════════════════════════════');
    console.log('  ✅ SEEDING COMPLETED SUCCESSFULLY');
    console.log('════════════════════════════════════════\n');

    console.log('📋 SUMMARY:');
    console.log(`   • Total Vendors: ${createdVendors.length}`);
    console.log(`   • Hotels: 3`);
    console.log(`   • Restaurants: 3`);
    console.log(`   • Retail Stores: 2`);
    console.log(`   • Services: 2`);
    console.log(`   • Tours: 2`);
    console.log(`   • Delivery: 2\n`);

    console.log('🎯 NEXT STEPS:');
    console.log('   1. Refresh the admin dashboard');
    console.log('   2. Click on a business category (Hotels, Restaurants, etc.)');
    console.log('   3. See the vendors list populated with data!\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

seedData();
