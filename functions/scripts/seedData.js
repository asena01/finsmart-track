import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Organization from '../models/Organization.js';
import Furniture from '../models/Furniture.js';
import Hair from '../models/Hair.js';
import Pets from '../models/Pets.js';
import GymEquipment from '../models/GymEquipment.js';
import DeliveryZone from '../models/DeliveryZone.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Furniture.deleteMany({});
    await Hair.deleteMany({});
    await Pets.deleteMany({});
    await GymEquipment.deleteMany({});
    await User.deleteMany({ userType: 'vendor' });
    await User.deleteMany({ userType: 'admin' });
    await Vendor.deleteMany({});
    await Organization.deleteMany({});
    await DeliveryZone.deleteMany({});
    await DeliveryPartner.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // ============ CREATE ADMIN ACCOUNT ============
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: 'admin123456',
      phone: '+1234567890',
      userType: 'admin',
      isVerified: true
    });
    await adminUser.save();
    console.log('✅ Created admin account');

    // ============ CREATE VENDOR ACCOUNTS ============
    const vendorAccounts = [
      {
        name: 'Premium Furniture Co',
        email: 'furniture@demo.com',
        password: 'furniture123456',
        phone: '+1234567890',
        userType: 'vendor',
        vendorType: 'furniture',
        businessName: 'Premium Furniture Co',
        businessDescription: 'High-quality furniture for every room'
      },
      {
        name: 'Hair Beauty Supply',
        email: 'hair@demo.com',
        password: 'hair123456',
        phone: '+1234567891',
        userType: 'vendor',
        vendorType: 'hair',
        businessName: 'Hair Beauty Supply',
        businessDescription: 'Premium hair products and extensions'
      },
      {
        name: 'Pet Supply Store',
        email: 'pets@demo.com',
        password: 'pets123456',
        phone: '+1234567892',
        userType: 'vendor',
        vendorType: 'pets',
        businessName: 'Pet Supply Store',
        businessDescription: 'Everything your pets need'
      },
      {
        name: 'FitnessPro Equipment',
        email: 'gym@demo.com',
        password: 'gym123456',
        phone: '+1234567893',
        userType: 'vendor',
        vendorType: 'gym-equipment',
        businessName: 'FitnessPro Equipment',
        businessDescription: 'Professional gym equipment and supplies'
      }
    ];

    const createdUsers = [];
    for (const vendor of vendorAccounts) {
      const user = new User(vendor);
      await user.save();
      createdUsers.push(user);
    }
    console.log('✅ Created 4 vendor accounts');

    // ============ CREATE VENDOR PROFILES ============
    const vendorProfiles = [
      {
        businessName: 'Premium Furniture Co',
        businessDescription: 'High-quality furniture for every room in your home',
        vendorType: 'furniture',
        email: 'furniture@demo.com',
        phone: '+1234567890',
        address: '123 Furniture Street',
        city: 'New York',
        country: 'USA',
        status: 'active',
        isVerified: true,
        owner: createdUsers[0]._id
      },
      {
        businessName: 'Hair Beauty Supply',
        businessDescription: 'Premium hair products, extensions, and wigs',
        vendorType: 'hair',
        email: 'hair@demo.com',
        phone: '+1234567891',
        address: '456 Hair Avenue',
        city: 'Los Angeles',
        country: 'USA',
        status: 'active',
        isVerified: true,
        owner: createdUsers[1]._id
      },
      {
        businessName: 'Pet Supply Store',
        businessDescription: 'Everything your pets need - food, toys, accessories',
        vendorType: 'pets',
        email: 'pets@demo.com',
        phone: '+1234567892',
        address: '789 Pet Lane',
        city: 'Chicago',
        country: 'USA',
        status: 'active',
        isVerified: true,
        owner: createdUsers[2]._id
      },
      {
        businessName: 'FitnessPro Equipment',
        businessDescription: 'Professional gym equipment and fitness supplies',
        vendorType: 'gym-equipment',
        email: 'gym@demo.com',
        phone: '+1234567893',
        address: '321 Fitness Drive',
        city: 'Houston',
        country: 'USA',
        status: 'active',
        isVerified: true,
        owner: createdUsers[3]._id
      }
    ];

    const createdVendors = [];
    for (const profile of vendorProfiles) {
      const vendor = new Vendor(profile);
      await vendor.save();
      createdVendors.push(vendor);
    }
    console.log('✅ Created 4 vendor profiles');

    // ============ CREATE ORGANIZATIONS ============
    const organizationRecords = [
      {
        name: 'Premium Furniture Co',
        type: 'retail',
        owner: createdUsers[0]._id,
        email: 'furniture@demo.com',
        phone: '+1234567890',
        address: {
          street: '123 Furniture Street',
          city: 'New York',
          country: 'USA'
        },
        description: 'High-quality furniture for every room in your home',
        status: 'active',
        isVerified: true,
        verificationDate: new Date(),
        subscriptionPlan: 'pro'
      },
      {
        name: 'Hair Beauty Supply',
        type: 'service',
        owner: createdUsers[1]._id,
        email: 'hair@demo.com',
        phone: '+1234567891',
        address: {
          street: '456 Hair Avenue',
          city: 'Los Angeles',
          country: 'USA'
        },
        description: 'Premium hair products, extensions, and wigs',
        status: 'active',
        isVerified: true,
        verificationDate: new Date(),
        subscriptionPlan: 'pro'
      },
      {
        name: 'Pet Supply Store',
        type: 'retail',
        owner: createdUsers[2]._id,
        email: 'pets@demo.com',
        phone: '+1234567892',
        address: {
          street: '789 Pet Lane',
          city: 'Chicago',
          country: 'USA'
        },
        description: 'Everything your pets need - food, toys, accessories',
        status: 'active',
        isVerified: true,
        verificationDate: new Date(),
        subscriptionPlan: 'basic'
      },
      {
        name: 'FitnessPro Equipment',
        type: 'retail',
        owner: createdUsers[3]._id,
        email: 'gym@demo.com',
        phone: '+1234567893',
        address: {
          street: '321 Fitness Drive',
          city: 'Houston',
          country: 'USA'
        },
        description: 'Professional gym equipment and fitness supplies',
        status: 'active',
        isVerified: true,
        verificationDate: new Date(),
        subscriptionPlan: 'basic'
      }
    ];

    for (const orgData of organizationRecords) {
      const org = new Organization(orgData);
      await org.save();
    }
    console.log('✅ Created 4 organizations');

    // ============ FURNITURE DATA ============
    const furnitureProducts = [
      {
        name: 'Modern Leather Sofa',
        price: 1299.99,
        stock: 15,
        sku: 'FURN-SOFA-001',
        category: 'living-room',
        description: 'Premium leather sofa with modern design',
        rating: { average: 4.8, count: 145 },
        material: 'Full Grain Leather',
        colors: ['Black', 'Brown', 'Gray'],
        dimensions: '85"L x 40"W x 35"H',
        weight: 250,
        shipping: { available: true, cost: 0, daysToDeliver: 5 },
        assembly: { required: true, estimatedTime: 2 },
        vendorId: createdUsers[0]._id,
        vendorName: 'Premium Furniture Co'
      },
      {
        name: 'Dining Table Set',
        price: 599.99,
        stock: 20,
        sku: 'FURN-TABLE-002',
        category: 'kitchen',
        description: 'Solid wood dining table with 6 chairs',
        rating: { average: 4.7, count: 89 },
        material: 'Solid Oak',
        colors: ['Natural', 'Walnut'],
        dimensions: '72"L x 36"W x 30"H',
        weight: 180,
        shipping: { available: true, cost: 50, daysToDeliver: 7 },
        assembly: { required: true, estimatedTime: 3 },
        vendorId: createdUsers[0]._id,
        vendorName: 'Premium Furniture Co'
      },
      {
        name: 'Queen Size Bed Frame',
        price: 449.99,
        stock: 12,
        sku: 'FURN-BED-003',
        category: 'bedroom',
        description: 'Contemporary queen bed frame with storage',
        rating: { average: 4.9, count: 234 },
        material: 'Engineered Wood',
        colors: ['White', 'Gray', 'Walnut'],
        dimensions: '60"W x 80"L x 48"H',
        weight: 120,
        shipping: { available: true, cost: 0, daysToDeliver: 5 },
        assembly: { required: true, estimatedTime: 2 },
        vendorId: createdUsers[0]._id,
        vendorName: 'Premium Furniture Co'
      },
      {
        name: 'Office Desk with Shelves',
        price: 349.99,
        stock: 25,
        sku: 'FURN-DESK-004',
        category: 'office',
        description: 'Spacious office desk with built-in shelving',
        rating: { average: 4.6, count: 167 },
        material: 'Laminated Wood',
        colors: ['Espresso', 'Cherry', 'Maple'],
        dimensions: '55"W x 24"D x 42"H',
        weight: 85,
        shipping: { available: true, cost: 25, daysToDeliver: 5 },
        assembly: { required: true, estimatedTime: 1.5 },
        vendorId: createdUsers[0]._id,
        vendorName: 'Premium Furniture Co'
      },
      {
        name: 'Outdoor Patio Set',
        price: 899.99,
        stock: 8,
        sku: 'FURN-PATIO-005',
        category: 'outdoor',
        description: 'Teak wood patio set with 4 chairs and table',
        rating: { average: 4.8, count: 178 },
        material: 'Solid Teak',
        colors: ['Natural'],
        dimensions: '36"D x 60"W x 36"H',
        weight: 350,
        shipping: { available: true, cost: 100, daysToDeliver: 7 },
        assembly: { required: true, estimatedTime: 1 },
        vendorId: createdUsers[0]._id,
        vendorName: 'Premium Furniture Co'
      },
      {
        name: 'Decorative Wall Shelves',
        price: 79.99,
        stock: 45,
        sku: 'FURN-SHELF-006',
        category: 'decor',
        description: 'Set of 3 floating wooden wall shelves',
        rating: { average: 4.5, count: 145 },
        material: 'Pine Wood',
        colors: ['White', 'Black', 'Walnut'],
        dimensions: '24"W x 8"D x 8"H (each)',
        weight: 15,
        shipping: { available: true, cost: 10, daysToDeliver: 3 },
        assembly: { required: true, estimatedTime: 0.5 },
        vendorId: createdUsers[0]._id,
        vendorName: 'Premium Furniture Co'
      }
    ];

    await Furniture.insertMany(furnitureProducts);
    console.log('✅ Seeded 6 Furniture products');

    // ============ HAIR DATA ============
    const hairProducts = [
      {
        name: 'Virgin Brazilian Hair Bundle',
        price: 119.99,
        stock: 30,
        sku: 'HAIR-BUNDLE-001',
        category: 'extensions',
        serviceType: 'product',
        description: 'Premium 100% virgin Brazilian hair - 16 inches',
        rating: { average: 4.9, count: 234 },
        hairSpec: {
          type: 'straight',
          length: { value: 16, unit: 'inches' },
          texture: 'Silky',
          source: '100% Virgin Human Hair',
          weight: { value: 3.5, unit: 'oz' },
          coverage: 'full head',
          color: ['Natural Black'],
          dyed: false
        },
        vendorId: createdUsers[1]._id,
        vendorName: 'Hair Beauty Supply'
      },
      {
        name: 'Deep Wave Hair Extension',
        price: 99.99,
        stock: 28,
        sku: 'HAIR-WAVE-002',
        category: 'extensions',
        serviceType: 'product',
        description: 'Deep wave hair extension - 18 inches',
        rating: { average: 4.8, count: 189 },
        hairSpec: {
          type: 'wavy',
          length: { value: 18, unit: 'inches' },
          texture: 'Deep Wave',
          source: 'Remy',
          weight: { value: 3.8, unit: 'oz' },
          coverage: 'full head',
          color: ['Natural Black'],
          dyed: false
        },
        vendorId: createdUsers[1]._id,
        vendorName: 'Hair Beauty Supply'
      },
      {
        name: 'Lace Front Wig',
        price: 129.99,
        stock: 28,
        sku: 'HAIR-WIG-003',
        category: 'wigs',
        serviceType: 'product',
        description: '360 lace front wig - Pre-plucked',
        rating: { average: 4.7, count: 145 },
        hairSpec: {
          type: 'straight',
          length: { value: 16, unit: 'inches' },
          texture: 'Straight',
          source: 'Virgin',
          weight: { value: 4.5, unit: 'oz' },
          coverage: 'full head',
          color: ['Natural Black'],
          dyed: false
        },
        vendorId: createdUsers[1]._id,
        vendorName: 'Hair Beauty Supply'
      },
      {
        name: 'Hair Growth Serum',
        price: 34.99,
        stock: 60,
        sku: 'HAIR-SERUM-004',
        category: 'human-hair',
        serviceType: 'product',
        description: 'Professional hair growth treatment',
        rating: { average: 4.6, count: 198 },
        hairSpec: {
          type: 'straight',
          length: { value: 0, unit: 'ml' },
          texture: 'Liquid',
          source: 'Organic',
          weight: { value: 100, unit: 'ml' },
          coverage: 'topical',
          color: ['Clear'],
          dyed: false
        },
        vendorId: createdUsers[1]._id,
        vendorName: 'Hair Beauty Supply'
      },
      {
        name: 'Hair Straightener',
        price: 45.99,
        stock: 32,
        sku: 'HAIR-STRAIGHT-005',
        category: 'braiding-services',
        serviceType: 'product',
        description: 'Professional ceramic hair straightener',
        rating: { average: 4.5, count: 156 },
        hairSpec: {
          type: 'straight',
          length: { value: 0, unit: 'inches' },
          texture: 'Ceramic',
          source: 'Professional',
          weight: { value: 1, unit: 'lb' },
          coverage: 'styling tool',
          color: ['Black'],
          dyed: false
        },
        vendorId: createdUsers[1]._id,
        vendorName: 'Hair Beauty Supply'
      },
      {
        name: 'Body Wave Bundle',
        price: 99.99,
        stock: 25,
        sku: 'HAIR-BODYWAVE-006',
        category: 'extensions',
        serviceType: 'product',
        description: 'Brazilian body wave hair - 20 inches',
        rating: { average: 4.8, count: 167 },
        hairSpec: {
          type: 'wavy',
          length: { value: 20, unit: 'inches' },
          texture: 'Body Wave',
          source: 'Virgin',
          weight: { value: 4, unit: 'oz' },
          coverage: 'full head',
          color: ['Natural Black'],
          dyed: false
        },
        vendorId: createdUsers[1]._id,
        vendorName: 'Hair Beauty Supply'
      }
    ];

    await Hair.insertMany(hairProducts);
    console.log('✅ Seeded 6 Hair products');

    // ============ PETS DATA ============
    const petsProducts = [
      {
        name: 'Premium Dog Food',
        price: 49.99,
        stock: 50,
        sku: 'PET-FOOD-001',
        category: 'dog-food',
        serviceType: 'product',
        description: 'High-protein dry dog food - 30 lbs',
        rating: { average: 4.8, count: 289 },
        brand: 'PetNutrition Pro',
        manufacturer: 'PetNutrition Inc',
        quantity: { value: 30, unit: 'lbs' },
        petSpecification: {
          petType: 'dog',
          suitableFor: ['Adult Dogs', 'All Breeds'],
          ageRange: { min: 1, max: 10, unit: 'years' },
          ingredients: ['Chicken', 'Brown Rice', 'Sweet Potato'],
          nutritionalInfo: { protein: '28%', fat: '18%', fiber: '4%', moisture: '10%' },
          allergienFree: ['grain-free'],
          organic: false
        },
        vendorId: createdUsers[2]._id,
        vendorName: 'Pet Supply Store'
      },
      {
        name: 'Cat Litter Box',
        price: 59.99,
        stock: 35,
        sku: 'PET-LITTER-002',
        category: 'accessories',
        serviceType: 'product',
        description: 'Self-cleaning automatic cat litter box',
        rating: { average: 4.7, count: 267 },
        brand: 'LitterBot',
        manufacturer: 'LitterBot Industries',
        quantity: { value: 1, unit: 'piece' },
        petSpecification: {
          petType: 'cat',
          suitableFor: ['Adult Cats', 'Senior Cats'],
          ageRange: { min: 1, max: 15, unit: 'years' },
          ingredients: [],
          nutritionalInfo: { protein: 'N/A', fat: 'N/A', fiber: 'N/A', moisture: 'N/A' },
          allergienFree: [],
          organic: false
        },
        vendorId: createdUsers[2]._id,
        vendorName: 'Pet Supply Store'
      },
      {
        name: 'Pet Bed Orthopedic',
        price: 79.99,
        stock: 25,
        sku: 'PET-BED-003',
        category: 'beds-houses',
        serviceType: 'product',
        description: 'Memory foam orthopedic pet bed - Large',
        rating: { average: 4.8, count: 178 },
        brand: 'ComfortPet',
        manufacturer: 'ComfortPet Inc',
        quantity: { value: 1, unit: 'piece' },
        petSpecification: {
          petType: 'dog',
          suitableFor: ['Large Dogs', 'Senior Dogs'],
          ageRange: { min: 0, max: 15, unit: 'years' },
          ingredients: [],
          nutritionalInfo: { protein: 'N/A', fat: 'N/A', fiber: 'N/A', moisture: 'N/A' },
          allergienFree: [],
          organic: false
        },
        vendorId: createdUsers[2]._id,
        vendorName: 'Pet Supply Store'
      },
      {
        name: 'Pet Grooming Kit',
        price: 34.99,
        stock: 45,
        sku: 'PET-GROOM-004',
        category: 'grooming',
        serviceType: 'product',
        description: 'Complete pet grooming set with brush, comb, and nail clipper',
        rating: { average: 4.6, count: 145 },
        brand: 'GroomPro',
        manufacturer: 'GroomPro Tools',
        quantity: { value: 1, unit: 'set' },
        petSpecification: {
          petType: 'dog',
          suitableFor: ['All Dogs'],
          ageRange: { min: 0, max: 15, unit: 'years' },
          ingredients: [],
          nutritionalInfo: { protein: 'N/A', fat: 'N/A', fiber: 'N/A', moisture: 'N/A' },
          allergienFree: [],
          organic: false
        },
        vendorId: createdUsers[2]._id,
        vendorName: 'Pet Supply Store'
      },
      {
        name: 'Aquarium Filter',
        price: 89.99,
        stock: 20,
        sku: 'PET-FILTER-005',
        category: 'accessories',
        serviceType: 'product',
        description: 'Advanced aquarium filter system - 100 gallon',
        rating: { average: 4.9, count: 198 },
        brand: 'AquaTech',
        manufacturer: 'AquaTech Solutions',
        quantity: { value: 1, unit: 'piece' },
        petSpecification: {
          petType: 'fish',
          suitableFor: ['Tropical Fish', 'All Fish Types'],
          ageRange: { min: 0, max: 20, unit: 'years' },
          ingredients: [],
          nutritionalInfo: { protein: 'N/A', fat: 'N/A', fiber: 'N/A', moisture: 'N/A' },
          allergienFree: [],
          organic: false
        },
        vendorId: createdUsers[2]._id,
        vendorName: 'Pet Supply Store'
      },
      {
        name: 'Small Animal Food Pellets',
        price: 24.99,
        stock: 60,
        sku: 'PET-PELLETS-006',
        category: 'dog-food',
        serviceType: 'product',
        description: 'Premium pellets for rabbits, hamsters, and guinea pigs - 5 lbs',
        rating: { average: 4.5, count: 134 },
        brand: 'SmallPetPro',
        manufacturer: 'SmallPetPro Inc',
        quantity: { value: 5, unit: 'lbs' },
        petSpecification: {
          petType: 'rabbit',
          suitableFor: ['Rabbits', 'Hamsters', 'Guinea Pigs'],
          ageRange: { min: 0, max: 10, unit: 'years' },
          ingredients: ['Timothy Hay', 'Alfalfa', 'Vegetables'],
          nutritionalInfo: { protein: '15%', fat: '3%', fiber: '18%', moisture: '12%' },
          allergienFree: [],
          organic: true
        },
        vendorId: createdUsers[2]._id,
        vendorName: 'Pet Supply Store'
      }
    ];

    await Pets.insertMany(petsProducts);
    console.log('✅ Seeded 6 Pets products');

    // ============ GYM EQUIPMENT DATA ============
    const gymProducts = [
      {
        name: 'Adjustable Dumbbells Set',
        price: 299.99,
        stock: 15,
        sku: 'GYM-DUMB-001',
        category: 'dumbbells',
        description: 'Adjustable dumbbell set 5-50 lbs',
        rating: { average: 4.8, count: 456 },
        specifications: {
          type: 'free-weight',
          material: ['Steel', 'Rubber'],
          weight: { value: 50, unit: 'lbs' },
          dimensions: { width: 10, height: 10, depth: 20, unit: 'cm' },
          capacity: { value: 50, unit: 'lbs' },
          resistance: 'adjustable',
          resistanceLevels: 10,
          color: ['Black', 'Gray'],
          warranty: { duration: 24, coverage: 'parts and labor' }
        },
        features: ['Adjustable', 'Compact', 'Easy to Use'],
        targetMuscles: ['Biceps', 'Triceps', 'Shoulders', 'Chest'],
        fitnessLevel: 'beginner',
        vendorId: createdUsers[3]._id,
        vendorName: 'FitnessPro Equipment'
      },
      {
        name: 'Home Treadmill',
        price: 799.99,
        stock: 8,
        sku: 'GYM-TREAD-002',
        category: 'cardio',
        description: 'Motorized treadmill with 12 built-in programs',
        rating: { average: 4.7, count: 234 },
        specifications: {
          type: 'cardio',
          material: ['Steel', 'Plastic'],
          weight: { value: 150, unit: 'kg' },
          dimensions: { width: 80, height: 150, depth: 180, unit: 'cm' },
          capacity: { value: 300, unit: 'lbs' },
          resistance: 'adjustable',
          resistanceLevels: 15,
          color: ['Black'],
          warranty: { duration: 36, coverage: 'parts and labor' }
        },
        features: ['12 Programs', 'LCD Display', 'Foldable'],
        targetMuscles: ['Cardiovascular'],
        fitnessLevel: 'all-levels',
        vendorId: createdUsers[3]._id,
        vendorName: 'FitnessPro Equipment'
      },
      {
        name: 'Olympic Weight Plates Set',
        price: 349.99,
        stock: 20,
        sku: 'GYM-PLATES-003',
        category: 'barbells',
        description: 'Complete Olympic weight plate set 100 lbs',
        rating: { average: 4.9, count: 189 },
        specifications: {
          type: 'free-weight',
          material: ['Cast Iron'],
          weight: { value: 100, unit: 'lbs' },
          dimensions: { width: 45, height: 45, depth: 5, unit: 'cm' },
          capacity: { value: 1000, unit: 'lbs' },
          resistance: 'fixed',
          resistanceLevels: 6,
          color: ['Black'],
          warranty: { duration: 12, coverage: 'manufacturing defects' }
        },
        features: ['Olympic Size', 'Durable', 'Professional Grade'],
        targetMuscles: ['Full Body'],
        fitnessLevel: 'intermediate',
        vendorId: createdUsers[3]._id,
        vendorName: 'FitnessPro Equipment'
      },
      {
        name: 'Yoga Mat Premium',
        price: 49.99,
        stock: 60,
        sku: 'GYM-YOGA-004',
        category: 'accessories',
        description: 'Non-slip yoga mat 6mm thick with carrying strap',
        rating: { average: 4.8, count: 567 },
        specifications: {
          type: 'accessory',
          material: ['Rubber', 'PVC'],
          weight: { value: 2, unit: 'kg' },
          dimensions: { width: 61, height: 183, depth: 0.6, unit: 'cm' },
          capacity: { value: 300, unit: 'lbs' },
          resistance: 'fixed',
          resistanceLevels: 1,
          color: ['Purple', 'Black', 'Blue', 'Green'],
          warranty: { duration: 12, coverage: 'manufacturing defects' }
        },
        features: ['Non-slip', 'Carrying Strap', 'Eco-friendly'],
        targetMuscles: ['Full Body'],
        fitnessLevel: 'beginner',
        vendorId: createdUsers[3]._id,
        vendorName: 'FitnessPro Equipment'
      },
      {
        name: 'Rowing Machine',
        price: 599.99,
        stock: 10,
        sku: 'GYM-ROW-005',
        category: 'cardio',
        description: 'Magnetic resistance rowing machine with monitor',
        rating: { average: 4.7, count: 267 },
        specifications: {
          type: 'cardio',
          material: ['Steel', 'Aluminum'],
          weight: { value: 100, unit: 'kg' },
          dimensions: { width: 80, height: 100, depth: 250, unit: 'cm' },
          capacity: { value: 300, unit: 'lbs' },
          resistance: 'adjustable',
          resistanceLevels: 8,
          color: ['Black'],
          warranty: { duration: 24, coverage: 'parts and labor' }
        },
        features: ['Magnetic Resistance', 'LCD Monitor', 'Foldable'],
        targetMuscles: ['Back', 'Legs', 'Arms', 'Core'],
        fitnessLevel: 'intermediate',
        vendorId: createdUsers[3]._id,
        vendorName: 'FitnessPro Equipment'
      },
      {
        name: 'Adjustable Kettlebell',
        price: 89.99,
        stock: 35,
        sku: 'GYM-KETTLE-006',
        category: 'dumbbells',
        description: 'Adjustable kettlebell 5-40 lbs with stand',
        rating: { average: 4.8, count: 312 },
        specifications: {
          type: 'free-weight',
          material: ['Cast Iron'],
          weight: { value: 40, unit: 'lbs' },
          dimensions: { width: 25, height: 30, depth: 25, unit: 'cm' },
          capacity: { value: 40, unit: 'lbs' },
          resistance: 'adjustable',
          resistanceLevels: 8,
          color: ['Black'],
          warranty: { duration: 24, coverage: 'parts and labor' }
        },
        features: ['Adjustable', 'Compact', 'With Stand'],
        targetMuscles: ['Full Body', 'Core', 'Legs'],
        fitnessLevel: 'intermediate',
        vendorId: createdUsers[3]._id,
        vendorName: 'FitnessPro Equipment'
      }
    ];

    await GymEquipment.insertMany(gymProducts);
    console.log('✅ Seeded 6 Gym Equipment products');

    // ============ DEFAULT DELIVERY PARTNERS ============
    const defaultPartners = [
      {
        name: 'Express Delivery Co',
        email: 'express@delivery.com',
        phone: '+1-800-EXPRESS',
        pricingModel: 'hybrid',
        status: 'verified',
        isVerified: true,
        capabilities: ['standard', 'express', 'scheduled'],
        serviceAreas: [],
        operatingHours: {
          start: '06:00',
          end: '23:00',
          timezone: 'UTC'
        },
        metrics: {
          totalDeliveries: 0,
          averageRating: 0,
          onTimePercentage: 0
        }
      },
      {
        name: 'Quick Pickup Service',
        email: 'quick@pickup.com',
        phone: '+1-800-QUICK',
        pricingModel: 'distance-based',
        status: 'verified',
        isVerified: true,
        capabilities: ['standard', 'express'],
        serviceAreas: [],
        operatingHours: {
          start: '07:00',
          end: '22:00',
          timezone: 'UTC'
        },
        metrics: {
          totalDeliveries: 0,
          averageRating: 0,
          onTimePercentage: 0
        }
      },
      {
        name: 'Premium Logistics',
        email: 'premium@logistics.com',
        phone: '+1-800-PREMIUM',
        pricingModel: 'zone-based',
        status: 'verified',
        isVerified: true,
        capabilities: ['standard', 'express', 'scheduled', 'white-glove'],
        serviceAreas: [],
        operatingHours: {
          start: '05:00',
          end: '23:59',
          timezone: 'UTC'
        },
        metrics: {
          totalDeliveries: 0,
          averageRating: 0,
          onTimePercentage: 0
        }
      }
    ];

    const createdPartners = [];
    for (const partner of defaultPartners) {
      const p = new DeliveryPartner(partner);
      await p.save();
      createdPartners.push(p);
    }
    console.log('✅ Created 3 default delivery partners');

    // ============ DEFAULT DELIVERY ZONES ============
    const defaultZones = [
      {
        name: 'Downtown Zone',
        description: 'Fast urban delivery for downtown areas',
        location: {
          city: 'Downtown',
          state: 'Central',
          country: 'USA'
        },
        category: 'downtown',
        basePricing: {
          basePrice: { value: 5.99, currency: 'USD' },
          minPrice: 3.99,
          maxPrice: 25,
          freeDeliveryAbove: 50
        },
        distancePricing: {
          enabled: true,
          pricePerKm: { value: 0.50, currency: 'USD' },
          radiusKm: 5
        },
        deliveryTimeEstimates: {
          standard: { min: 30, max: 60, unit: 'minutes' },
          express: { min: 15, max: 30, unit: 'minutes' }
        },
        serviceOptions: [
          { name: 'Standard', description: 'Regular delivery', deliveryTimeMin: 30, deliveryTimeMax: 60, priceMultiplier: 1 },
          { name: 'Express', description: 'Faster delivery', deliveryTimeMin: 15, deliveryTimeMax: 30, priceMultiplier: 1.5 },
          { name: 'Scheduled', description: 'Pick your time', deliveryTimeMin: 60, deliveryTimeMax: 120, priceMultiplier: 0.8 }
        ],
        isActive: true,
        availableDeliveryPartners: [createdPartners[0]._id, createdPartners[1]._id, createdPartners[2]._id],
        preferredPartner: createdPartners[0]._id
      },
      {
        name: 'Suburban Zone',
        description: 'Reliable delivery for suburban areas',
        location: {
          city: 'Suburban',
          state: 'Outer',
          country: 'USA'
        },
        category: 'suburban',
        basePricing: {
          basePrice: { value: 7.99, currency: 'USD' },
          minPrice: 5.99,
          maxPrice: 30,
          freeDeliveryAbove: 75
        },
        distancePricing: {
          enabled: true,
          pricePerKm: { value: 0.65, currency: 'USD' },
          radiusKm: 15
        },
        deliveryTimeEstimates: {
          standard: { min: 45, max: 90, unit: 'minutes' },
          express: { min: 30, max: 60, unit: 'minutes' }
        },
        serviceOptions: [
          { name: 'Standard', description: 'Regular delivery', deliveryTimeMin: 45, deliveryTimeMax: 90, priceMultiplier: 1 },
          { name: 'Express', description: 'Faster delivery', deliveryTimeMin: 30, deliveryTimeMax: 60, priceMultiplier: 1.4 },
          { name: 'Scheduled', description: 'Pick your time', deliveryTimeMin: 120, deliveryTimeMax: 240, priceMultiplier: 0.75 }
        ],
        isActive: true,
        availableDeliveryPartners: [createdPartners[1]._id, createdPartners[2]._id],
        preferredPartner: createdPartners[2]._id
      },
      {
        name: 'Rural Zone',
        description: 'Delivery service to rural and remote areas',
        location: {
          city: 'Rural',
          state: 'Remote',
          country: 'USA'
        },
        category: 'rural',
        basePricing: {
          basePrice: { value: 12.99, currency: 'USD' },
          minPrice: 9.99,
          maxPrice: 45,
          freeDeliveryAbove: 100
        },
        distancePricing: {
          enabled: true,
          pricePerKm: { value: 0.85, currency: 'USD' },
          radiusKm: 50
        },
        deliveryTimeEstimates: {
          standard: { min: 2, max: 4, unit: 'hours' },
          express: { min: 1, max: 2, unit: 'hours' }
        },
        serviceOptions: [
          { name: 'Standard', description: 'Regular delivery', deliveryTimeMin: 120, deliveryTimeMax: 240, priceMultiplier: 1 },
          { name: 'Express', description: 'Faster delivery', deliveryTimeMin: 60, deliveryTimeMax: 120, priceMultiplier: 1.3 }
        ],
        isActive: true,
        availableDeliveryPartners: [createdPartners[2]._id],
        preferredPartner: createdPartners[2]._id
      },
      {
        name: 'Commercial Hub',
        description: 'High-volume delivery for commercial areas',
        location: {
          city: 'Commerce District',
          state: 'Central',
          country: 'USA'
        },
        category: 'commercial',
        basePricing: {
          basePrice: { value: 6.99, currency: 'USD' },
          minPrice: 4.99,
          maxPrice: 40,
          freeDeliveryAbove: 100
        },
        distancePricing: {
          enabled: true,
          pricePerKm: { value: 0.55, currency: 'USD' },
          radiusKm: 10
        },
        deliveryTimeEstimates: {
          standard: { min: 30, max: 75, unit: 'minutes' },
          express: { min: 15, max: 30, unit: 'minutes' }
        },
        serviceOptions: [
          { name: 'Standard', description: 'Regular delivery', deliveryTimeMin: 30, deliveryTimeMax: 75, priceMultiplier: 1 },
          { name: 'Express', description: 'Priority delivery', deliveryTimeMin: 15, deliveryTimeMax: 30, priceMultiplier: 1.6 },
          { name: 'Bulk', description: 'Large orders', deliveryTimeMin: 60, deliveryTimeMax: 120, priceMultiplier: 0.9 }
        ],
        isActive: true,
        availableDeliveryPartners: [createdPartners[0]._id, createdPartners[1]._id, createdPartners[2]._id],
        preferredPartner: createdPartners[1]._id
      }
    ];

    for (const zone of defaultZones) {
      const z = new DeliveryZone(zone);
      await z.save();
    }
    console.log('✅ Created 4 default delivery zones with preset pricing');

    console.log('\n🎉 ============================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('🎉 ============================================\n');
    console.log('📝 DEMO CREDENTIALS:\n');
    console.log('⚙️  ADMIN:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: admin123456\n');
    console.log('🛋️  FURNITURE VENDOR:');
    console.log('   Email: furniture@demo.com');
    console.log('   Password: furniture123456\n');
    console.log('💇 HAIR VENDOR:');
    console.log('   Email: hair@demo.com');
    console.log('   Password: hair123456\n');
    console.log('🐾 PETS VENDOR:');
    console.log('   Email: pets@demo.com');
    console.log('   Password: pets123456\n');
    console.log('💪 GYM EQUIPMENT VENDOR:');
    console.log('   Email: gym@demo.com');
    console.log('   Password: gym123456\n');
    console.log('📊 DATA SEEDED:');
    console.log('   ✅ 1 Admin User Created');
    console.log('   ✅ 4 Vendor Users Created');
    console.log('   ✅ 4 Vendor Profiles Created');
    console.log('   ✅ 4 Organizations Created (for Admin Dashboard)');
    console.log('   ✅ 24 Products Created (6 per category)');
    console.log('   ✅ 3 Default Delivery Partners Created');
    console.log('   ✅ 4 Default Delivery Zones Created with Preset Pricing\n');
    console.log('🚚 DEFAULT DELIVERY ZONES:');
    console.log('   1️⃣  Downtown Zone - $5.99 base + $0.50/km (5km radius)');
    console.log('   2️⃣  Suburban Zone - $7.99 base + $0.65/km (15km radius)');
    console.log('   3️⃣  Rural Zone - $12.99 base + $0.85/km (50km radius)');
    console.log('   4️⃣  Commercial Hub - $6.99 base + $0.55/km (10km radius)\n');
    console.log('Each zone includes:');
    console.log('   • Multiple service options (Standard, Express, Scheduled)');
    console.log('   • Free delivery thresholds');
    console.log('   • 3 verified delivery partners to choose from\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();
