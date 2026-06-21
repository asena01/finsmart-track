import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import StaffActivityLog from '../models/StaffActivityLog.js';
import PreArrivalCheckIn from '../models/PreArrivalCheckIn.js';
import OccupancyAnalytics from '../models/OccupancyAnalytics.js';
import Hotel from '../models/Hotel.js';
import Staff from '../models/Staff.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import { connectDB } from '../database.js';

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get or use default hotel ID
    const hotelId = '69d0eca53b2942a9fc4c58e2'; // User specified hotel ID

    // Clear existing data
    await Transaction.deleteMany({ hotel: hotelId });
    await StaffActivityLog.deleteMany({ hotel: hotelId });
    await PreArrivalCheckIn.deleteMany({ hotel: hotelId });
    await OccupancyAnalytics.deleteMany({ hotel: hotelId });
    console.log('✅ Cleared existing data');

    // ==================== SEED TRANSACTIONS (Revenue) ====================
    const transactions = [
      {
        hotel: hotelId,
        type: 'room',
        description: 'Room 101 - 3 nights stay',
        amount: 450,
        guestName: 'John Doe',
        status: 'completed',
        paymentMethod: 'card'
      },
      {
        hotel: hotelId,
        type: 'food',
        description: 'Room Service - Dinner',
        amount: 85,
        guestName: 'Jane Smith',
        status: 'completed',
        paymentMethod: 'card'
      },
      {
        hotel: hotelId,
        type: 'drink',
        description: 'Mini Bar - Beverages',
        amount: 45,
        guestName: 'Mike Johnson',
        status: 'completed',
        paymentMethod: 'cash'
      },
      {
        hotel: hotelId,
        type: 'room',
        description: 'Room 202 - 2 nights stay',
        amount: 298,
        guestName: 'Jane Smith',
        status: 'pending',
        paymentMethod: 'transfer'
      },
      {
        hotel: hotelId,
        type: 'service',
        description: 'Spa Treatment & Massage',
        amount: 120,
        guestName: 'Sarah Davis',
        status: 'completed',
        paymentMethod: 'card'
      },
      {
        hotel: hotelId,
        type: 'food',
        description: 'Restaurant - Breakfast',
        amount: 65,
        guestName: 'John Doe',
        status: 'completed',
        paymentMethod: 'card'
      },
      {
        hotel: hotelId,
        type: 'room',
        description: 'Room 303 - 4 nights stay',
        amount: 520,
        guestName: 'David Wilson',
        status: 'completed',
        paymentMethod: 'card'
      },
      {
        hotel: hotelId,
        type: 'drink',
        description: 'Bar - Premium Cocktails',
        amount: 95,
        guestName: 'Sarah Davis',
        status: 'completed',
        paymentMethod: 'card'
      }
    ];

    await Transaction.insertMany(transactions);
    console.log(`✅ Created ${transactions.length} sample transactions`);

    // ==================== SEED STAFF ACTIVITY LOGS ====================
    // Create staff records first
    const staffRecords = await Staff.find({ hotel: hotelId }).limit(4);
    const staffIds = staffRecords.length > 0 ? staffRecords.map(s => s._id) : [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId()
    ];

    const staffLogs = [
      {
        hotel: hotelId,
        staff: staffIds[0],
        staffName: 'Alice Johnson',
        staffPosition: 'receptionist',
        action: 'login',
        description: 'Staff logged in to system',
        status: 'success'
      },
      {
        hotel: hotelId,
        staff: staffIds[1],
        staffName: 'Bob Smith',
        staffPosition: 'housekeeping',
        action: 'room-cleaned',
        description: 'Room 101 cleaned and inspected',
        status: 'success',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        hotel: hotelId,
        staff: staffIds[0],
        staffName: 'Alice Johnson',
        staffPosition: 'receptionist',
        action: 'check-in',
        description: 'Guest checked in - John Doe',
        status: 'success',
        timestamp: new Date(Date.now() - 7200000)
      },
      {
        hotel: hotelId,
        staff: staffIds[2],
        staffName: 'Carol Davis',
        staffPosition: 'chef',
        action: 'order-processed',
        description: 'Room service order prepared',
        status: 'success',
        timestamp: new Date(Date.now() - 10800000)
      },
      {
        hotel: hotelId,
        staff: staffIds[1],
        staffName: 'Bob Smith',
        staffPosition: 'housekeeping',
        action: 'room-cleaned',
        description: 'Room 202 cleaned and ready',
        status: 'success',
        timestamp: new Date(Date.now() - 14400000)
      },
      {
        hotel: hotelId,
        staff: staffIds[3],
        staffName: 'David Wilson',
        staffPosition: 'maintenance',
        action: 'maintenance',
        description: 'AC unit repaired in Room 305',
        status: 'success',
        timestamp: new Date(Date.now() - 18000000)
      },
      {
        hotel: hotelId,
        staff: staffIds[0],
        staffName: 'Alice Johnson',
        staffPosition: 'receptionist',
        action: 'check-in',
        description: 'Guest checked in - Sarah Davis',
        status: 'success',
        timestamp: new Date(Date.now() - 21600000)
      },
      {
        hotel: hotelId,
        staff: staffIds[2],
        staffName: 'Carol Davis',
        staffPosition: 'chef',
        action: 'order-processed',
        description: '3 orders completed and ready for delivery',
        status: 'success',
        timestamp: new Date(Date.now() - 25200000)
      }
    ];

    await StaffActivityLog.insertMany(staffLogs);
    console.log(`✅ Created ${staffLogs.length} sample staff activity logs`);

    // ==================== SEED PRE-ARRIVAL CHECK-INS ====================
    // Get existing bookings or use dummy IDs
    const Booking = mongoose.model('Booking');
    let existingBookings = [];
    try {
      existingBookings = await Booking.find({ hotel: hotelId }).limit(5);
    } catch (e) {
      console.log('⚠️  No existing bookings found, using placeholder IDs');
    }

    const bookingIds = existingBookings.length > 0 ?
      existingBookings.map(b => b._id) :
      [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
      ];

    const checkIns = [
      {
        hotel: hotelId,
        booking: bookingIds[0],
        bookingId: 'BK001',
        guestName: 'John Doe',
        email: 'john@example.com',
        phone: '+234-800-1234567',
        idType: 'passport',
        idNumber: 'A12345678',
        checkInDate: new Date(Date.now() + 3600000),
        checkOutDate: new Date(Date.now() + 259200000),
        roomType: 'double',
        numberOfGuests: 2,
        specialRequests: 'High floor preferred',
        status: 'completed',
        verifiedAt: new Date(),
        completedAt: new Date()
      },
      {
        hotel: hotelId,
        booking: bookingIds[1],
        bookingId: 'BK002',
        guestName: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+234-800-2345678',
        idType: 'national-id',
        idNumber: 'NG-123-456-789',
        checkInDate: new Date(Date.now() + 7200000),
        checkOutDate: new Date(Date.now() + 345600000),
        roomType: 'suite',
        numberOfGuests: 1,
        specialRequests: '',
        status: 'verified',
        verifiedAt: new Date()
      },
      {
        hotel: hotelId,
        booking: bookingIds[2],
        bookingId: 'BK003',
        guestName: 'Mike Johnson',
        email: 'mike@example.com',
        phone: '+234-800-3456789',
        idType: 'driver-license',
        idNumber: 'DL-98765432',
        checkInDate: new Date(Date.now() + 10800000),
        checkOutDate: new Date(Date.now() + 432000000),
        roomType: 'single',
        numberOfGuests: 1,
        specialRequests: 'Late check-in requested',
        status: 'pending'
      },
      {
        hotel: hotelId,
        booking: bookingIds[3],
        bookingId: 'BK004',
        guestName: 'Sarah Davis',
        email: 'sarah@example.com',
        phone: '+234-800-4567890',
        idType: 'passport',
        idNumber: 'B87654321',
        checkInDate: new Date(Date.now() + 14400000),
        checkOutDate: new Date(Date.now() + 518400000),
        roomType: 'deluxe',
        numberOfGuests: 3,
        specialRequests: 'Crib for baby needed',
        status: 'completed',
        verifiedAt: new Date(Date.now() - 7200000),
        completedAt: new Date(Date.now() - 3600000)
      },
      {
        hotel: hotelId,
        booking: bookingIds[4],
        bookingId: 'BK005',
        guestName: 'David Wilson',
        email: 'david@example.com',
        phone: '+234-800-5678901',
        idType: 'national-id',
        idNumber: 'NG-987-654-321',
        checkInDate: new Date(Date.now() + 18000000),
        checkOutDate: new Date(Date.now() + 604800000),
        roomType: 'double',
        numberOfGuests: 2,
        specialRequests: 'Business traveler - meetings room needed',
        status: 'pending'
      }
    ];

    await PreArrivalCheckIn.insertMany(checkIns);
    console.log(`✅ Created ${checkIns.length} sample pre-arrival check-ins`);

    // ==================== SEED SAMPLE BOOKINGS (for room revenue) ====================
    // Get actual rooms to link bookings
    const actualRooms = await Room.find({ hotel: hotelId }).limit(5);

    if (actualRooms.length > 0) {
      const sampleBookings = [
        {
          hotel: hotelId,
          room: actualRooms[0]._id,
          guest: new mongoose.Types.ObjectId(),
          bookingNumber: 'BK-' + Date.now() + '-1',
          checkInDate: new Date(Date.now() - 86400000 * 3),
          checkOutDate: new Date(Date.now() - 86400000),
          numberOfNights: 3,
          numberOfGuests: 2,
          roomRate: 450,
          subtotal: 1350,
          tax: 135,
          totalPrice: 1485,
          status: 'checked-out',
          paymentStatus: 'paid'
        },
        {
          hotel: hotelId,
          room: actualRooms[1]?._id || actualRooms[0]._id,
          guest: new mongoose.Types.ObjectId(),
          bookingNumber: 'BK-' + Date.now() + '-2',
          checkInDate: new Date(Date.now() - 86400000 * 2),
          checkOutDate: new Date(Date.now()),
          numberOfNights: 2,
          numberOfGuests: 1,
          roomRate: 350,
          subtotal: 700,
          tax: 70,
          totalPrice: 770,
          status: 'checked-in',
          paymentStatus: 'paid'
        },
        {
          hotel: hotelId,
          room: actualRooms[2]?._id || actualRooms[0]._id,
          guest: new mongoose.Types.ObjectId(),
          bookingNumber: 'BK-' + Date.now() + '-3',
          checkInDate: new Date(Date.now() + 86400000),
          checkOutDate: new Date(Date.now() + 86400000 * 3),
          numberOfNights: 2,
          numberOfGuests: 3,
          roomRate: 500,
          subtotal: 1000,
          tax: 100,
          totalPrice: 1100,
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      ];

      try {
        const Booking = mongoose.model('Booking');
        await Booking.deleteMany({ hotel: hotelId });
        await Booking.insertMany(sampleBookings);
        console.log(`✅ Created ${sampleBookings.length} sample bookings (room revenue source)`);
      } catch (e) {
        console.log('ℹ️  Booking creation skipped (model may not be available)');
      }
    }

    // ==================== SEED OCCUPANCY ANALYTICS ====================
    // Get actual rooms to match real data
    const rooms = await Room.find({ hotel: hotelId });
    const totalRooms = rooms.length || 10; // Use actual room count or default to 10

    // Group rooms by type
    const roomsByType = {};
    rooms.forEach(room => {
      const type = room.roomType || 'other';
      if (!roomsByType[type]) {
        roomsByType[type] = { total: 0, occupied: 0 };
      }
      roomsByType[type].total += 1;
      if (room.status === 'occupied') {
        roomsByType[type].occupied += 1;
      }
    });

    // Create 7 days of analytics
    const analyticsData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // Realistic occupancy based on actual room count
      const occupancyRate = 40 + Math.random() * 50; // 40-90%
      const occupiedRooms = Math.round((occupancyRate / 100) * totalRooms);
      const revenue = occupiedRooms * (300 + Math.random() * 200); // ₦300-500 per room

      // Build room type breakdown from actual data
      const roomTypeBreakdown = Object.entries(roomsByType).map(([type, data]) => {
        const typeOccupancyRate = Math.round((Math.random() * 40 + 30)); // 30-70%
        return {
          roomType: type.charAt(0).toUpperCase() + type.slice(1),
          total: data.total,
          occupied: Math.round((typeOccupancyRate / 100) * data.total),
          occupancyRate: typeOccupancyRate
        };
      });

      analyticsData.push({
        hotel: hotelId,
        date,
        occupancyRate: Math.round(occupancyRate),
        occupiedRooms,
        totalRooms,
        revenue: Math.round(revenue),
        totalGuests: Math.round(occupiedRooms * 1.5), // Average 1.5 guests per room
        averageStay: 2.5 + Math.random() * 2,
        peakCheckInTime: '4-6 PM',
        roomTypeBreakdown
      });
    }

    await OccupancyAnalytics.insertMany(analyticsData);
    console.log(`✅ Created ${analyticsData.length} days of occupancy analytics`);

    console.log('\n🎉 Seed data created successfully!');
    console.log('========================================');
    console.log(`✅ ${transactions.length} Transactions`);
    console.log(`✅ ${staffLogs.length} Staff Activity Logs`);
    console.log(`✅ ${checkIns.length} Pre-Arrival Check-Ins`);
    console.log(`✅ ${analyticsData.length} Days of Analytics`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
