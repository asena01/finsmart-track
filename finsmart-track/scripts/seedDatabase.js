import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Staff from '../models/Staff.js';
import Maintenance from '../models/Maintenance.js';
import Invoice from '../models/Invoice.js';
import FoodOrder from '../models/FoodOrder.js';
import Menu from '../models/Menu.js';
import RoomServiceMenuItem from '../models/RoomServiceMenuItem.js';
import Device from '../models/Device.js';
import Tour from '../models/Tour.js';
import Service from '../models/Service.js';
import ServiceBooking from '../models/ServiceBooking.js';
import Delivery from '../models/Delivery.js';
import Order from '../models/Order.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://fingecsmarthotels:WhqTOg0rGPib0FvE@cluster0.nfxzw.mongodb.net/test';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Hotel.deleteMany({}),
      Room.deleteMany({}),
      Booking.deleteMany({}),
      Staff.deleteMany({}),
      Maintenance.deleteMany({}),
      Invoice.deleteMany({}),
      FoodOrder.deleteMany({}),
      Menu.deleteMany({}),
      RoomServiceMenuItem.deleteMany({}),
      Device.deleteMany({}),
      Tour.deleteMany({}),
      Service.deleteMany({}),
      ServiceBooking.deleteMany({}),
      Delivery.deleteMany({}),
      Order.deleteMany({})
    ]);
    console.log('✅ Cleared existing data');

    // Create sample hotel owner user
    console.log('👤 Creating hotel owner user...');
    const owner = await User.create({
      name: 'Robert Johnson',
      email: 'robert@grandplaza.com',
      password: 'password123',
      phone: '+1-800-123-4567',
      userType: 'vendor',
      vendorType: 'hotel',
      businessName: 'Grand Plaza Hotel',
      businessDescription: 'A luxury 5-star hotel with world-class amenities',
      isVerified: true
    });
    console.log('✅ Created hotel owner:', owner._id);

    // Create sample guest users (using create() to trigger password hashing pre-save hook)
    console.log('👥 Creating sample guest users...');
    const guestsData = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '+1-555-0101',
        userType: 'customer'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        phone: '+1-555-0102',
        userType: 'customer'
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        password: 'password123',
        phone: '+1-555-0103',
        userType: 'customer'
      }
    ];
    const guests = await Promise.all(guestsData.map(data => User.create(data)));
    console.log('✅ Created', guests.length, 'guest users');

    // Create admin user
    console.log('⚙️  Creating admin user...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: 'admin123456',
      phone: '+1234567890',
      userType: 'admin',
      isVerified: true
    });
    console.log('✅ Created admin user:', admin._id);

    // Create sample hotel
    console.log('🏨 Creating sample hotel...');
    const hotelData = {
      name: 'Grand Plaza Hotel',
      description: 'A luxury 5-star hotel with world-class amenities',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      zipCode: '10001',
      phone: '+1-800-123-4567',
      email: 'contact@grandplaza.com',
      website: 'www.grandplaza.com',
      owner: owner._id,
      totalRooms: 200,
      rating: 4.7,
      amenities: ['WiFi', 'Gym', 'Pool', 'Restaurant', 'Spa', 'Parking'],
      checkInTime: '14:00',
      checkOutTime: '11:00',
      thumbnail: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop',
      photos: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1582719508762-e881b08e601d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1595521624779-f3141f476e94?w=800&h=600&fit=crop'
      ],
      logo: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=100&h=100&fit=crop'
    };

    const hotel = await Hotel.create(hotelData);
    console.log('✅ Created hotel:', hotel._id);

    // Create sample rooms
    console.log('🛏️  Creating sample rooms...');
    const roomsData = [
      { hotel: hotel._id, roomNumber: '101', roomType: 'single', capacity: 1, floor: 1, pricePerNight: 99, status: 'available', images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '102', roomType: 'double', capacity: 2, floor: 1, pricePerNight: 149, status: 'occupied', images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '103', roomType: 'suite', capacity: 4, floor: 1, pricePerNight: 299, status: 'available', images: ['https://images.unsplash.com/photo-1582719508762-e881b08e601d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '201', roomType: 'double', capacity: 2, floor: 2, pricePerNight: 179, status: 'occupied', images: ['https://images.unsplash.com/photo-1595521624779-f3141f476e94?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '202', roomType: 'deluxe', capacity: 2, floor: 2, pricePerNight: 249, status: 'maintenance', images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1582719508762-e881b08e601d?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '203', roomType: 'suite', capacity: 4, floor: 2, pricePerNight: 349, status: 'available', images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1595521624779-f3141f476e94?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '301', roomType: 'single', capacity: 1, floor: 3, pricePerNight: 119, status: 'available', images: ['https://images.unsplash.com/photo-1582719508762-e881b08e601d?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '302', roomType: 'double', capacity: 2, floor: 3, pricePerNight: 159, status: 'occupied', images: ['https://images.unsplash.com/photo-1595521624779-f3141f476e94?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '303', roomType: 'deluxe', capacity: 2, floor: 3, pricePerNight: 279, status: 'available', images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1582719508762-e881b08e601d?w=600&h=400&fit=crop'] },
      { hotel: hotel._id, roomNumber: '401', roomType: 'suite', capacity: 4, floor: 4, pricePerNight: 399, status: 'available', images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1595521624779-f3141f476e94?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1582719508762-e881b08e601d?w=600&h=400&fit=crop'] }
    ];

    const rooms = await Room.insertMany(roomsData);
    console.log('✅ Created', rooms.length, 'rooms');

    // Create sample bookings for testing the dashboard
    console.log('📅 Creating sample bookings...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekPlus3 = new Date(today);
    nextWeekPlus3.setDate(nextWeekPlus3.getDate() + 10);

    const bookingsData = [
      {
        hotel: hotel._id,
        guest: guests[0]._id,
        room: rooms[0]._id,
        checkInDate: tomorrow,
        checkOutDate: nextWeek,
        numberOfNights: 6,
        numberOfGuests: 1,
        numberOfRooms: 1,
        roomRate: 99,
        subtotal: 594,
        tax: 60,
        discount: 0,
        totalPrice: 654,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'credit_card',
        specialRequests: 'High floor preferred',
        bookingNumber: 'BK001'
      },
      {
        hotel: hotel._id,
        guest: guests[1]._id,
        room: rooms[1]._id,
        checkInDate: nextWeek,
        checkOutDate: nextWeekPlus3,
        numberOfNights: 3,
        numberOfGuests: 2,
        numberOfRooms: 1,
        roomRate: 149,
        subtotal: 447,
        tax: 45,
        discount: 0,
        totalPrice: 492,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'debit_card',
        specialRequests: 'Anniversary celebration',
        bookingNumber: 'BK002'
      },
      {
        hotel: hotel._id,
        guest: guests[2]._id,
        room: rooms[4]._id,
        checkInDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        checkOutDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
        numberOfNights: 2,
        numberOfGuests: 2,
        numberOfRooms: 1,
        roomRate: 249,
        subtotal: 498,
        tax: 50,
        discount: 0,
        totalPrice: 548,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'online',
        specialRequests: null,
        bookingNumber: 'BK003'
      }
    ];

    const bookings = await Booking.insertMany(bookingsData);
    console.log('✅ Created', bookings.length, 'sample bookings');

    // Create sample staff
    console.log('👨‍💼 Creating sample staff...');
    const staffData = [
      {
        hotel: hotel._id,
        name: 'Alice Johnson',
        email: 'alice@grandplaza.com',
        phone: '+1-800-111-1111',
        position: 'manager',
        department: 'front-office',
        salary: 5000,
        status: 'active'
      },
      {
        hotel: hotel._id,
        name: 'Bob Smith',
        email: 'bob@grandplaza.com',
        phone: '+1-800-111-2222',
        position: 'receptionist',
        department: 'front-office',
        salary: 2500,
        status: 'active'
      },
      {
        hotel: hotel._id,
        name: 'Carol Davis',
        email: 'carol@grandplaza.com',
        phone: '+1-800-111-3333',
        position: 'chef',
        department: 'kitchen',
        salary: 4000,
        status: 'active'
      },
      {
        hotel: hotel._id,
        name: 'David Wilson',
        email: 'david@grandplaza.com',
        phone: '+1-800-111-4444',
        position: 'housekeeping',
        department: 'housekeeping',
        salary: 2000,
        status: 'active'
      },
      {
        hotel: hotel._id,
        name: 'Emma Brown',
        email: 'emma@grandplaza.com',
        phone: '+1-800-111-5555',
        position: 'maintenance',
        department: 'maintenance',
        salary: 2200,
        status: 'active'
      }
    ];

    const staff = await Staff.insertMany(staffData);
    console.log('✅ Created', staff.length, 'staff members');

    // Create sample maintenance requests
    console.log('🔧 Creating sample maintenance requests...');
    const maintenanceData = [
      {
        hotel: hotel._id,
        room: rooms[4]._id,
        roomNumber: '202',
        issue: 'Air conditioner not working',
        category: 'heating',
        priority: 'high',
        status: 'in-progress',
        reportedDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
        assignedTo: staff[4]._id
      },
      {
        hotel: hotel._id,
        roomNumber: '301',
        issue: 'Leaky faucet in bathroom',
        category: 'plumbing',
        priority: 'medium',
        status: 'open',
        reportedDate: new Date()
      },
      {
        hotel: hotel._id,
        roomNumber: '205',
        issue: 'Door lock malfunction',
        category: 'electrical',
        priority: 'critical',
        status: 'open',
        reportedDate: new Date()
      }
    ];

    const maintenance = await Maintenance.insertMany(maintenanceData);
    console.log('✅ Created', maintenance.length, 'maintenance requests');

    // Create sample invoices (only if bookings exist)
    console.log('🧾 Creating sample invoices...');
    let invoices = [];
    if (bookings.length > 0) {
      const invoicesData = [
        {
          hotel: hotel._id,
          invoiceNumber: 'INV-001',
          booking: bookings[0]._id,
          guest: guests[0]._id,
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          amount: 596,
          tax: 60,
          totalAmount: 656,
          status: 'paid',
          paidDate: new Date()
        },
        {
          hotel: hotel._id,
          invoiceNumber: 'INV-002',
          booking: bookings[1]._id,
          guest: guests[1]._id,
          guestName: 'Jane Smith',
          guestEmail: 'jane@example.com',
          amount: 537,
          tax: 54,
          totalAmount: 591,
          status: 'issued'
        }
      ];

      invoices = await Invoice.insertMany(invoicesData);
    }
    console.log('✅ Created', invoices.length, 'invoices');

    // Create sample room service menu items
    console.log('🍽️  Creating sample room service menu items...');
    const menuItemsData = [
      {
        hotel: hotel._id,
        name: 'Grilled Salmon',
        category: 'main',
        price: 28.99,
        availability: 'lunch',
        roomServiceEligible: true,
        preparationTime: 25,
        dietary: ['gluten-free']
      },
      {
        hotel: hotel._id,
        name: 'Caesar Salad',
        category: 'appetizer',
        price: 12.99,
        availability: 'all-day',
        roomServiceEligible: true,
        preparationTime: 10
      },
      {
        hotel: hotel._id,
        name: 'Espresso',
        category: 'beverage',
        price: 4.99,
        availability: 'all-day',
        roomServiceEligible: true,
        preparationTime: 5
      },
      {
        hotel: hotel._id,
        name: 'Chocolate Lava Cake',
        category: 'dessert',
        price: 8.99,
        availability: 'all-day',
        roomServiceEligible: true,
        preparationTime: 12,
        dietary: ['vegetarian']
      },
      {
        hotel: hotel._id,
        name: 'Orange Juice',
        category: 'beverage',
        price: 5.99,
        availability: 'breakfast',
        roomServiceEligible: true,
        preparationTime: 3
      },
      {
        hotel: hotel._id,
        name: 'French Toast',
        category: 'main',
        price: 15.99,
        availability: 'breakfast',
        roomServiceEligible: true,
        preparationTime: 15,
        dietary: ['vegetarian']
      }
    ];

    const menuItems = await RoomServiceMenuItem.insertMany(menuItemsData);
    console.log('✅ Created', menuItems.length, 'room service menu items');

    // Create sample menus (skipped - requires restaurant reference)
    console.log('📋 Skipping sample menus (requires restaurant reference)...');
    const menus = [];
    // const menusData = [...];
    // const menus = await Menu.insertMany(menusData);
    // console.log('✅ Created', menus.length, 'menus');

    // Create sample food orders
    console.log('🍴 Creating sample food orders...');
    const foodOrdersData = [
      {
        hotel: hotel._id,
        orderId: 'FO-001',
        roomNumber: '102',
        guestName: 'John Doe',
        items: ['Grilled Salmon', 'Caesar Salad', 'Espresso'],
        totalPrice: 46.97,
        status: 'delivered',
        category: 'mixed',
        assignedStaff: staff[2]._id,
        orderTime: new Date(today.getTime() - 2 * 60 * 60 * 1000),
        prepStartTime: new Date(today.getTime() - 115 * 60 * 1000),
        prepEndTime: new Date(today.getTime() - 95 * 60 * 1000),
        deliveryStartTime: new Date(today.getTime() - 95 * 60 * 1000),
        deliveryEndTime: new Date(today.getTime() - 85 * 60 * 1000)
      },
      {
        hotel: hotel._id,
        orderId: 'FO-002',
        roomNumber: '201',
        guestName: 'Jane Smith',
        items: ['French Toast', 'Orange Juice'],
        totalPrice: 21.98,
        status: 'ready',
        category: 'mixed',
        assignedStaff: staff[2]._id,
        orderTime: new Date(today.getTime() - 30 * 60 * 1000),
        prepStartTime: new Date(today.getTime() - 25 * 60 * 1000),
        prepEndTime: new Date(today.getTime() - 15 * 60 * 1000)
      },
      {
        hotel: hotel._id,
        orderId: 'FO-003',
        roomNumber: '301',
        guestName: 'Mike Johnson',
        items: ['Chocolate Lava Cake', 'Espresso'],
        totalPrice: 13.98,
        status: 'pending',
        category: 'mixed',
        orderTime: new Date()
      }
    ];

    const foodOrders = await FoodOrder.insertMany(foodOrdersData);
    console.log('✅ Created', foodOrders.length, 'food orders');

    // Create sample devices
    console.log('📱 Creating sample devices...');
    const devicesData = [
      {
        deviceId: 'MS-001',
        hotel: hotel._id,
        roomNumber: 101,
        deviceType: 'motion_sensor',
        status: true,
        lastDetection: 'Just now'
      },
      {
        deviceId: 'MS-002',
        hotel: hotel._id,
        roomNumber: 102,
        deviceType: 'motion_sensor',
        status: true,
        lastDetection: '5 mins ago'
      },
      {
        deviceId: 'SL-001',
        hotel: hotel._id,
        roomNumber: 101,
        deviceType: 'smart_lock',
        status: true,
        lastDetection: '10 mins ago'
      },
      {
        deviceId: 'TH-001',
        hotel: hotel._id,
        roomNumber: 102,
        deviceType: 'thermostat',
        status: true,
        lastDetection: '1 min ago'
      },
      {
        deviceId: 'CAM-001',
        deviceType: 'camera',
        status: true,
        lastDetection: '30 secs ago'
      }
    ];

    const devices = await Device.insertMany(devicesData);
    console.log('✅ Created', devices.length, 'devices');

    // Create sample tour operator user
    console.log('🧑‍✈️ Creating tour operator user...');
    const tourOperator = await User.create({
      name: 'Adventure Tours Inc',
      email: 'info@adventuretours.com',
      password: 'password123',
      phone: '+1-800-987-6543',
      userType: 'vendor',
      vendorType: 'tour-operator',
      businessName: 'Adventure Tours Inc',
      businessDescription: 'Premium travel experiences worldwide',
      isVerified: true
    });
    console.log('✅ Created tour operator:', tourOperator._id);

    // Create sample tours
    console.log('🗺️  Creating sample tours...');
    const toursData = [
      {
        name: 'Paris City Tour',
        destination: 'Paris, France',
        price: 899,
        duration: '3 days',
        difficulty: 'Easy',
        groupSize: '2-10 people',
        highlights: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Seine River Cruise'],
        includes: ['Accommodation', 'Breakfast', 'Guided Tours', 'Transport'],
        image: '🗼',
        rating: 4.8,
        reviews: 2840,
        maxParticipants: 20,
        currentParticipants: 12,
        description: 'Explore the City of Light with our expert guides. Visit iconic landmarks and experience authentic Parisian culture.',
        tourOperator: tourOperator._id,
        operatorName: 'Adventure Tours Inc',
        operatorPhone: '+1-800-987-6543',
        operatorEmail: 'info@adventuretours.com',
        location: {
          city: 'Paris',
          country: 'France',
          coordinates: {
            latitude: 48.8566,
            longitude: 2.3522
          }
        },
        amenities: ['WiFi', 'Meals', 'Transportation', 'Travel Insurance'],
        languages: ['English', 'French', 'Spanish'],
        isActive: true
      },
      {
        name: 'Bali Beach Adventure',
        destination: 'Bali, Indonesia',
        price: 599,
        duration: '5 days',
        difficulty: 'Easy',
        groupSize: '2-15 people',
        highlights: ['Beach Clubs', 'Rice Terraces', 'Temples', 'Surfing'],
        includes: ['Accommodation', 'Meals', 'Activities', 'Transfers'],
        image: '🏝️',
        rating: 4.7,
        reviews: 1956,
        maxParticipants: 25,
        currentParticipants: 18,
        description: 'Experience tropical paradise with pristine beaches, rich culture, and thrilling water sports.',
        tourOperator: tourOperator._id,
        operatorName: 'Adventure Tours Inc',
        operatorPhone: '+1-800-987-6543',
        operatorEmail: 'info@adventuretours.com',
        location: {
          city: 'Bali',
          country: 'Indonesia',
          coordinates: {
            latitude: -8.6705,
            longitude: 115.2126
          }
        },
        amenities: ['Beach Access', 'Spa Services', 'Water Sports', 'Local Guides'],
        languages: ['English', 'Indonesian'],
        isActive: true
      },
      {
        name: 'Tokyo Cultural Tour',
        destination: 'Tokyo, Japan',
        price: 1199,
        duration: '4 days',
        difficulty: 'Moderate',
        groupSize: '2-8 people',
        highlights: ['Senso-ji Temple', 'Shibuya Crossing', 'Mount Fuji', 'Sumo Show'],
        includes: ['Hotels', 'Rail Pass', 'Meals', 'Excursions'],
        image: '🗻',
        rating: 4.9,
        reviews: 3124,
        maxParticipants: 15,
        currentParticipants: 8,
        description: 'Discover the perfect blend of ancient traditions and cutting-edge modernity in Japan\'s vibrant capital.',
        tourOperator: tourOperator._id,
        operatorName: 'Adventure Tours Inc',
        operatorPhone: '+1-800-987-6543',
        operatorEmail: 'info@adventuretours.com',
        location: {
          city: 'Tokyo',
          country: 'Japan',
          coordinates: {
            latitude: 35.6762,
            longitude: 139.6503
          }
        },
        amenities: ['JR Rail Pass', 'Temples Access', 'Sumo Tickets', 'Expert Guides'],
        languages: ['English', 'Japanese'],
        isActive: true
      },
      {
        name: 'Safari Experience',
        destination: 'Kenya',
        price: 1499,
        duration: '6 days',
        difficulty: 'Moderate',
        groupSize: '4-12 people',
        highlights: ['Big Five', 'Masai Mara', 'Wildlife Safari', 'Cultural Village'],
        includes: ['Lodge Stays', 'Game Drives', 'Meals', 'Guide Services'],
        image: '🦁',
        rating: 4.6,
        reviews: 1245,
        maxParticipants: 12,
        currentParticipants: 10,
        description: 'Witness Africa\'s incredible wildlife in their natural habitat with professional game guides and comfortable lodges.',
        tourOperator: tourOperator._id,
        operatorName: 'Adventure Tours Inc',
        operatorPhone: '+1-800-987-6543',
        operatorEmail: 'info@adventuretours.com',
        location: {
          city: 'Nairobi',
          country: 'Kenya',
          coordinates: {
            latitude: -1.2768,
            longitude: 36.7539
          }
        },
        amenities: ['4WD Vehicles', 'Professional Guides', 'Binoculars', 'Photography Support'],
        languages: ['English', 'Swahili'],
        isActive: true
      }
    ];

    const tours = await Tour.insertMany(toursData);
    console.log('✅ Created', tours.length, 'tours');

    // Create service provider user
    console.log('👔 Creating service provider user...');
    const serviceProvider = await User.create({
      name: 'Professional Services Co',
      email: 'services@professional.com',
      password: 'password123',
      phone: '+1-800-555-7890',
      userType: 'vendor',
      vendorType: 'service',
      businessName: 'Professional Services Co',
      businessDescription: 'Comprehensive home and business services',
      isVerified: true
    });
    console.log('✅ Created service provider:', serviceProvider._id);

    // Create sample services
    console.log('🔧 Creating sample services...');
    const servicesData = [
      {
        name: 'Professional House Cleaning',
        description: 'Complete house cleaning service with eco-friendly products. Includes dusting, vacuuming, mopping, and bathroom cleaning.',
        category: 'cleaning',
        icon: '🧹',
        serviceProvider: serviceProvider._id,
        providerName: 'Professional Services Co',
        providerPhone: '+1-800-555-7890',
        providerEmail: 'services@professional.com',
        basePrice: 150,
        pricePerUnit: 150,
        priceUnit: 'visit',
        duration: '2-3 hours',
        serviceArea: 'City-wide',
        location: {
          city: 'New York',
          area: 'Manhattan',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        rating: 4.8,
        reviews: 345,
        features: ['Eco-friendly', 'Insured', 'Quick service', 'Satisfaction guaranteed'],
        certifications: ['Green Clean Certified', 'Insured & Bonded'],
        isVerified: true,
        isActive: true
      },
      {
        name: 'Plumbing Emergency Repair',
        description: '24/7 emergency plumbing services. Leaks, clogs, water damage, and more. Fast response time guaranteed.',
        category: 'plumbing',
        icon: '🔧',
        serviceProvider: serviceProvider._id,
        providerName: 'Professional Services Co',
        providerPhone: '+1-800-555-7890',
        providerEmail: 'services@professional.com',
        basePrice: 200,
        pricePerUnit: 200,
        priceUnit: 'visit',
        duration: '1-2 hours',
        serviceArea: 'City-wide',
        location: {
          city: 'New York',
          area: 'Manhattan',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        rating: 4.9,
        reviews: 512,
        features: ['24/7 Available', 'Licensed plumber', 'Same-day service', 'No hidden charges'],
        certifications: ['Master Plumber', 'Licensed & Insured'],
        isVerified: true,
        isActive: true
      },
      {
        name: 'Electrical Installation & Repair',
        description: 'Professional electrical services including installations, repairs, and upgrades. Safety certified and fully insured.',
        category: 'electrical',
        icon: '⚡',
        serviceProvider: serviceProvider._id,
        providerName: 'Professional Services Co',
        providerPhone: '+1-800-555-7890',
        providerEmail: 'services@professional.com',
        basePrice: 180,
        pricePerUnit: 180,
        priceUnit: 'hour',
        duration: '1-3 hours',
        serviceArea: 'City-wide',
        location: {
          city: 'New York',
          area: 'Manhattan',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        rating: 4.7,
        reviews: 289,
        features: ['Licensed electrician', 'Modern tools', 'Warranty on work', 'Free estimates'],
        certifications: ['Licensed Electrician', 'Safety Certified'],
        isVerified: true,
        isActive: true
      },
      {
        name: 'Deep Cleaning & Maintenance',
        description: 'Comprehensive deep cleaning for homes and offices. Regular maintenance plans available for consistent service.',
        category: 'cleaning',
        icon: '✨',
        serviceProvider: serviceProvider._id,
        providerName: 'Professional Services Co',
        providerPhone: '+1-800-555-7890',
        providerEmail: 'services@professional.com',
        basePrice: 250,
        pricePerUnit: 250,
        priceUnit: 'visit',
        duration: '4-5 hours',
        serviceArea: 'City-wide',
        location: {
          city: 'New York',
          area: 'Manhattan',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        rating: 4.9,
        reviews: 678,
        features: ['Thorough cleaning', 'Carpet shampooing', 'Window cleaning', 'Flexible scheduling'],
        certifications: ['Professional Cleaner', 'Certified Green Cleaner'],
        isVerified: true,
        isActive: true
      },
      {
        name: 'General Maintenance & Repairs',
        description: 'Handyman services for all types of home maintenance and repairs. From minor fixes to major projects.',
        category: 'maintenance',
        icon: '🛠️',
        serviceProvider: serviceProvider._id,
        providerName: 'Professional Services Co',
        providerPhone: '+1-800-555-7890',
        providerEmail: 'services@professional.com',
        basePrice: 120,
        pricePerUnit: 120,
        priceUnit: 'hour',
        duration: '1-4 hours',
        serviceArea: 'City-wide',
        location: {
          city: 'New York',
          area: 'Manhattan',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        rating: 4.6,
        reviews: 421,
        features: ['Quick response', 'Quality workmanship', 'Affordable rates', 'Flexible scheduling'],
        certifications: ['Certified Handyman', 'Experienced in all repairs'],
        isVerified: true,
        isActive: true
      },
      {
        name: 'Beauty & Spa Services',
        description: 'Professional beauty treatments and spa services at your location. Manicure, pedicure, facial, and massage services.',
        category: 'health-beauty',
        icon: '💅',
        serviceProvider: serviceProvider._id,
        providerName: 'Professional Services Co',
        providerPhone: '+1-800-555-7890',
        providerEmail: 'services@professional.com',
        basePrice: 80,
        pricePerUnit: 80,
        priceUnit: 'hour',
        duration: '1-2 hours',
        serviceArea: 'City-wide',
        location: {
          city: 'New York',
          area: 'Manhattan',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        rating: 4.8,
        reviews: 567,
        features: ['Professional staff', 'Premium products', 'Relaxing experience', 'Home service available'],
        certifications: ['Licensed esthetician', 'Certified massage therapist'],
        isVerified: true,
        isActive: true
      }
    ];

    const services = await Service.insertMany(servicesData);
    console.log('✅ Created', services.length, 'services');

    // Create delivery provider user
    console.log('🚚 Creating delivery provider user...');
    const deliveryProvider = await User.create({
      name: 'FastDeliver Inc',
      email: 'info@fastdeliver.com',
      password: 'password123',
      phone: '+1-800-DELIVER',
      userType: 'vendor',
      vendorType: 'delivery',
      businessName: 'FastDeliver Inc',
      businessDescription: 'Fast and reliable delivery service with multiple vehicle options',
      isVerified: true
    });
    console.log('✅ Created delivery provider:', deliveryProvider._id);

    // Create sample deliveries (skipped due to model validation requirements)
    console.log('📦 Skipping sample deliveries...');
    /*const _deliveriesData = [
      {
        orderNumber: 'DLV-' + Date.now().toString().slice(-6) + '-A1B2C3',
        provider: deliveryProvider._id,
        providerName: 'FastDeliver Inc',
        providerPhone: '+1-800-DELIVER',
        providerEmail: 'info@fastdeliver.com',
        customerName: 'John Doe',
        customerPhone: '+1-555-0123',
        customerEmail: 'john@example.com',
        pickupLocation: {
          address: '123 Commerce St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: { latitude: 40.7505, longitude: -74.0005 }
        },
        deliveryLocation: {
          address: '456 Madison Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10022',
          coordinates: { latitude: 40.7535, longitude: -73.9832 }
        },
        package: {
          description: 'Electronics package',
          quantity: 1,
          weight: { value: 2.5, unit: 'kg' },
          dimensions: { length: 30, width: 20, height: 15, unit: 'cm' },
          totalSize: { category: 'medium', maxItems: 1 },
          fragile: true,
          value: 299.99
        },
        deliveryMethod: {
          type: 'bike',
          description: 'Motorcycle delivery for fast service',
          maxWeight: { value: 5, unit: 'kg' },
          maxPackages: 3,
          features: ['tracked', 'insured']
        },
        serviceType: 'express',
        distance: { value: 2.5, unit: 'km' },
        estimatedTime: { value: 15, unit: 'minutes' },
        pricing: {
          baseRate: 5,
          distanceRate: { value: 0.5, perUnit: 'km' },
          weightRate: { value: 0.2, perUnit: 'kg' },
          sizeCharge: 5,
          subtotal: 13.75,
          tax: 1.38,
          totalPrice: 15.13
        },
        tracking: {
          status: 'in-transit',
          currentLocation: { latitude: 40.7520, longitude: -73.9918, address: 'En route' },
          trackingHistory: [{
            status: 'picked-up',
            location: { latitude: 40.7505, longitude: -74.0005 },
            timestamp: new Date(),
            notes: 'Package picked up from merchant'
          }],
          lastUpdate: new Date(),
          gpsEnabled: true
        },
        specialInstructions: 'Ring doorbell twice',
        paymentMethod: 'prepaid',
        paymentStatus: 'completed'
      },
      {
        orderNumber: 'DLV-' + (Date.now() + 1000).toString().slice(-6) + '-D4E5F6',
        provider: deliveryProvider._id,
        providerName: 'FastDeliver Inc',
        providerPhone: '+1-800-DELIVER',
        providerEmail: 'info@fastdeliver.com',
        customerName: 'Jane Smith',
        customerPhone: '+1-555-0124',
        customerEmail: 'jane@example.com',
        pickupLocation: {
          address: '789 Park Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10021',
          coordinates: { latitude: 40.7689, longitude: -73.9781 }
        },
        deliveryLocation: {
          address: '321 5th Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10016',
          coordinates: { latitude: 40.7614, longitude: -73.9776 }
        },
        package: {
          description: 'Large furniture item',
          quantity: 1,
          weight: { value: 45, unit: 'kg' },
          dimensions: { length: 180, width: 80, height: 60, unit: 'cm' },
          totalSize: { category: 'extra-large', maxItems: 1 },
          fragile: true,
          perishable: false,
          value: 1299.99
        },
        deliveryMethod: {
          type: 'van',
          description: 'Large van for bulky items',
          maxWeight: { value: 500, unit: 'kg' },
          maxPackages: 10,
          features: ['refrigerated', 'tracked', 'insured', 'dollies-provided']
        },
        serviceType: 'scheduled',
        distance: { value: 5.2, unit: 'km' },
        estimatedTime: { value: 45, unit: 'minutes' },
        pricing: {
          baseRate: 5,
          distanceCharge: 2.6,
          weightCharge: 9,
          sizeCharge: 30,
          subtotal: 36.6,
          tax: 3.66,
          totalPrice: 40.26
        },
        tracking: {
          status: 'confirmed',
          currentLocation: { latitude: 40.7689, longitude: -73.9781, address: 'Awaiting pickup' },
          trackingHistory: [],
          lastUpdate: new Date(),
          gpsEnabled: true
        },
        specialInstructions: 'Requires elevator access. Call ahead 30 mins before arrival',
        paymentMethod: 'cash-on-delivery',
        paymentStatus: 'pending'
      }
    ];*/

    // Skip delivery insertion due to model validation requirements
    const deliveries = [];
    console.log('⏭️  Skipped delivery creation');

    // Create sample shopping orders for the first customer
    console.log('🛍️  Creating sample shopping orders...');
    const customer = guests[0]; // John Doe
    const timestamp = Date.now();
    const shoppingOrders = await Order.insertMany([
      {
        orderId: `ORD-${timestamp}-001`,
        userId: customer._id,
        userEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: '123 Main St, New York, NY 10001',
        items: [
          {
            id: 'prod-001',
            name: 'Premium Winter Jacket',
            price: 4599,
            quantity: 1,
            category: 'Adult Wears',
            serviceType: 'shopping'
          }
        ],
        subtotal: 4599,
        tax: 459,
        total: 5058,
        paymentStatus: 'completed',
        paymentMethod: 'card',
        status: 'delivered',
        trackingNumber: `TRK-${timestamp}-001`,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        orderId: `ORD-${timestamp}-002`,
        userId: customer._id,
        userEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: '123 Main St, New York, NY 10001',
        items: [
          {
            id: 'prod-002',
            name: 'Gold Necklace Set',
            price: 1899,
            quantity: 1,
            category: 'Jewelry',
            serviceType: 'shopping'
          },
          {
            id: 'prod-003',
            name: 'Casual Summer Dress',
            price: 2899,
            quantity: 1,
            category: 'Adult Wears',
            serviceType: 'shopping'
          }
        ],
        subtotal: 4798,
        tax: 479,
        total: 5277,
        paymentStatus: 'completed',
        paymentMethod: 'card',
        status: 'shipped',
        trackingNumber: `TRK-${timestamp}-002`,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        orderId: `ORD-${timestamp}-003`,
        userId: customer._id,
        userEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: '123 Main St, New York, NY 10001',
        items: [
          {
            id: 'prod-004',
            name: 'Trendy Kids Sneakers',
            price: 3299,
            quantity: 2,
            category: 'Children Wears',
            serviceType: 'shopping'
          }
        ],
        subtotal: 6598,
        tax: 659,
        total: 7257,
        paymentStatus: 'completed',
        paymentMethod: 'card',
        status: 'processing',
        trackingNumber: `TRK-${timestamp}-003`,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ]);
    console.log('✅ Created', shoppingOrders.length, 'shopping orders');

    console.log('\n✨ Database seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users (Customers): ${guests.length}`);
    console.log(`   - Hotels: ${1}`);
    console.log(`   - Rooms: ${rooms.length}`);
    console.log(`   - Bookings: ${bookings.length}`);
    console.log(`   - Staff: ${staff.length}`);
    console.log(`   - Maintenance Requests: ${maintenance.length}`);
    console.log(`   - Invoices: ${invoices.length}`);
    console.log(`   - Room Service Items: ${menuItems.length}`);
    console.log(`   - Menus: ${menus.length}`);
    console.log(`   - Food Orders: ${foodOrders.length}`);
    console.log(`   - Devices: ${devices.length}`);
    console.log(`   - Tours: ${tours.length}`);
    console.log(`   - Services: ${services.length}`);
    console.log(`   - Shopping Orders: ${shoppingOrders.length}`);
    console.log(`   - Deliveries: ${deliveries.length}`);
    console.log(`\n🏨 Hotel ID for API calls: ${hotel._id}`);
    console.log(`\n👤 Demo Customer Login Credentials:`);
    console.log(`   Email: ${customer.email}`);
    console.log(`   Password: password123`);
    console.log(`   Customer ID: ${customer._id}`);
    console.log(`\n🛍️ This customer has 3 sample shopping orders ready to view in the dashboard!`);

    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
