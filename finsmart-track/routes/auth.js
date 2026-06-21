import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import VendorKyc from '../models/VendorKyc.js';
import VendorPerformance from '../models/VendorPerformance.js';
import Vendor from '../models/Vendor.js';
import Hotel from '../models/Hotel.js';
import Restaurant from '../models/Restaurant.js';
import Tour from '../models/Tour.js';
import Staff from '../models/Staff.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, userType, phone, vendorType, businessName, businessDescription } = req.body;

    console.log('📝 Registration attempt:', { name, email, userType });
    console.log('📌 Request body:', req.body);

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone: phone || '',
      userType: userType || 'customer',
      ...(userType === 'vendor' && {
        vendorType,
        businessName,
        businessDescription,
      }),
    });

    await user.save();
    console.log('✅ User created successfully:', user._id);

    // Track created business IDs for response
    let createdBusinessIds = {};

    console.log('🔍 Vendor creation check - userType:', userType);

    // Create vendor-specific records
    if (userType === 'vendor') {
      console.log('🏢 VENDOR DETECTED - Creating vendor records...');
      console.log('   vendorType:', vendorType);
      console.log('   name:', name);
      console.log('   businessName:', businessName);
      console.log('   user._id:', user._id);

      try {
        // Create VendorKyc record
        const vendorKyc = new VendorKyc({
          vendor: user._id,
          vendorType: vendorType || 'service',
          status: 'pending'
        });
        await vendorKyc.save();
        console.log('✅ VendorKyc created successfully:', vendorKyc._id);

        // Create VendorPerformance record
        const vendorPerformance = new VendorPerformance({
          vendor: user._id,
          vendorType: vendorType || 'service'
        });
        await vendorPerformance.save();
        console.log('✅ VendorPerformance created successfully:', vendorPerformance._id);

        // Create Hotel record for hotel vendors
        if (vendorType === 'hotel') {
          console.log('🏨 Creating Hotel record...');
          const hotel = new Hotel({
            name: businessName || `${name}'s Hotel`,
            description: businessDescription || '',
            owner: user._id,
            email: email,
            phone: phone || '',
            checkInTime: '14:00',
            checkOutTime: '11:00'
          });
          await hotel.save();
          console.log('✅ Hotel profile created successfully:', hotel._id);
          // Use userId as hotelId - the endpoint will query by owner
          createdBusinessIds.hotelId = user._id.toString();
          console.log('✅ hotelId set to userId:', createdBusinessIds.hotelId);
        } else {
          console.log('⚠️ vendorType is not "hotel", it is:', vendorType);
        }

        // Create Restaurant record for restaurant vendors
        if (vendorType === 'restaurant') {
          const restaurant = new Restaurant({
            name: businessName || `${name}'s Restaurant`,
            description: businessDescription || '',
            owner: user._id,
            email: email,
            phone: phone || '',
            cuisine: 'Mixed'
          });
          await restaurant.save();
          console.log('✅ Restaurant profile created successfully:', restaurant._id);
          createdBusinessIds.restaurantId = restaurant._id.toString();
        }

        // Create Tour record for tour operators
        if (vendorType === 'tour-operator') {
          const tour = new Tour({
            name: businessName || `${name}'s Tours`,
            description: businessDescription || '',
            tourOperator: user._id,
            email: email,
            phone: phone || ''
          });
          await tour.save();
          console.log('✅ Tour profile created successfully:', tour._id);
          createdBusinessIds.agencyId = tour._id.toString();
        }

        // Create Vendor profile for specific vendor types
        const vendorTypesWithProfile = ['furniture', 'hair', 'pets', 'gym-equipment'];
        if (vendorTypesWithProfile.includes(vendorType)) {
          const vendorProfile = new Vendor({
            owner: user._id,
            vendorType: vendorType,
            businessName: businessName || '',
            businessDescription: businessDescription || '',
            email: email,
            phone: phone || '',
            address: '',
            city: '',
            country: '',
            status: 'pending'
          });
          await vendorProfile.save();
          console.log('✅ Vendor profile created successfully:', vendorProfile._id);
        }
      } catch (error) {
        console.error('⚠️ Error creating vendor records:', error.message);
        // Don't fail the registration if these records fail to create
      }
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    console.log('📤 SENDING SIGNUP RESPONSE:');
    console.log('   createdBusinessIds:', createdBusinessIds);
    console.log('   userType:', userType);
    console.log('   vendorType:', vendorType);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.toJSON(),
      businessIds: createdBusinessIds || {}
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔑 Login attempt:', { email });

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user (include password field)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', email);
    console.log('👤 User type:', user.userType);
    if (user.userType === 'vendor') {
      console.log('🏢 Vendor type:', user.vendorType);
    }

    const userResponse = user.toJSON();
    let businessIds = {};

    // For vendors, find and include their business records
    if (user.userType === 'vendor') {
      try {
        // Find Hotel record for hotel vendors
        if (user.vendorType === 'hotel') {
          const hotel = await Hotel.findOne({ owner: user._id });
          if (hotel) {
            // Return the actual hotel ID (not userId)
            businessIds.hotelId = hotel._id.toString();
            console.log('✅ Hotel found, hotelId set to hotel._id:', businessIds.hotelId);
          } else {
            console.log('⚠️ No hotel record found for owner:', user._id);
            // Fallback to userId if hotel doesn't exist yet
            businessIds.hotelId = user._id.toString();
          }
        }

        // Find Restaurant record for restaurant vendors
        if (user.vendorType === 'restaurant') {
          const restaurant = await Restaurant.findOne({ owner: user._id });
          if (restaurant) {
            businessIds.restaurantId = restaurant._id.toString();
            console.log('✅ Restaurant ID found:', businessIds.restaurantId);
          }
        }

        // Find Tour record for tour operators
        if (user.vendorType === 'tour-operator') {
          const tour = await Tour.findOne({ tourOperator: user._id });
          if (tour) {
            businessIds.agencyId = tour._id.toString();
            console.log('✅ Agency ID found:', businessIds.agencyId);
          }
        }
      } catch (error) {
        console.error('⚠️ Error finding business records:', error.message);
      }

      // Include deliveryPartnerId if user is a delivery vendor
      if (user.vendorType === 'delivery' && user.deliveryPartnerId) {
        userResponse.deliveryPartnerId = user.deliveryPartnerId;
        businessIds.deliveryId = user.deliveryPartnerId;
        console.log('🚚 Delivery Partner ID:', user.deliveryPartnerId);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse,
      businessIds
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post('/staff-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const staff = await Staff.findOne({ email }).select('+password').populate('hotel', 'name');
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordValid = await staff.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    staff.lastLogin = new Date();
    await staff.save();

    const token = jwt.sign(
      { id: staff._id, email: staff.email, type: 'staff', hotelId: staff.hotel?._id || staff.hotel },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Staff login successful',
      token,
      user: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        userType: 'staff',
        vendorType: 'hotel',
        hotelId: staff.hotel?._id || staff.hotel,
        hotelName: staff.hotel?.name || 'Hotel',
        staffPosition: staff.position,
        accessRole: staff.accessRole,
        allowedModules: staff.allowedModules || [],
        allowedAreas: staff.allowedAreas || [],
        permissions: staff.permissions || {},
        mustChangePassword: staff.mustChangePassword === true
      }
    });
  } catch (error) {
    console.error('❌ Staff login error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/staff-change-password', async (req, res) => {
  try {
    const { staffId, currentPassword, newPassword } = req.body;

    if (!staffId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'staffId, currentPassword and newPassword are required'
      });
    }

    const staff = await Staff.findById(staffId).select('+password');
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    const isValid = await staff.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    staff.password = newPassword;
    staff.mustChangePassword = false;
    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Staff change password error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create Demo Accounts (for testing)
router.post('/create-demo-accounts', async (req, res) => {
  try {
    console.log('🎭 Creating demo accounts...');

    const demoAccounts = [
      {
        name: 'Super Admin',
        email: 'admin@demo.com',
        password: 'admin123456',
        phone: '+1234567890',
        userType: 'admin',
        adminRole: 'super-admin',
        adminPermissions: {
          manageOrganizations: true,
          manageUsers: true,
          manageDevices: true,
          processPayments: true,
          viewAnalytics: true,
          manageSettings: true,
          manageSuspensions: true,
          viewLogs: true
        }
      },
      {
        name: 'Demo Customer',
        email: 'customer@demo.com',
        password: 'demo123456',
        phone: '+1234567890',
        userType: 'customer'
      },
      {
        name: 'Demo Hotel',
        email: 'hotel@demo.com',
        password: 'demo123456',
        phone: '+1234567892',
        userType: 'vendor',
        vendorType: 'hotel',
        businessName: 'Demo Hotel',
        businessDescription: 'A demo hotel for testing'
      },
      {
        name: 'Demo Restaurant',
        email: 'restaurant@demo.com',
        password: 'demo123456',
        phone: '+1234567891',
        userType: 'vendor',
        vendorType: 'restaurant',
        businessName: 'Demo Restaurant',
        businessDescription: 'A demo restaurant for testing'
      },
      {
        name: 'Demo Retail Store',
        email: 'retail@demo.com',
        password: 'demo123456',
        phone: '+1234567893',
        userType: 'vendor',
        vendorType: 'retail',
        businessName: 'Demo Retail Store',
        businessDescription: 'A demo retail store for testing'
      },
      {
        name: 'Demo Service',
        email: 'service@demo.com',
        password: 'demo123456',
        phone: '+1234567894',
        userType: 'vendor',
        vendorType: 'service',
        businessName: 'Demo Service Business',
        businessDescription: 'A demo service business for testing'
      },
      {
        name: 'Demo Tours Agency',
        email: 'tours@demo.com',
        password: 'demo123456',
        phone: '+1234567895',
        userType: 'vendor',
        vendorType: 'tour-operator',
        businessName: 'Demo Tours Agency',
        businessDescription: 'A demo tour operator for testing'
      }
    ];

    const createdUsers = [];

    for (const account of demoAccounts) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: account.email });
      if (!existingUser) {
        const user = new User(account);
        await user.save();
        createdUsers.push(account.email);
        console.log('✅ Created demo account:', account.email);

        // Create vendor records if vendor account
        if (account.userType === 'vendor') {
          try {
            // Create VendorKyc record
            const vendorKyc = new VendorKyc({
              vendor: user._id,
              vendorType: account.vendorType || 'service',
              status: 'pending'
            });
            await vendorKyc.save();

            // Create VendorPerformance record
            const vendorPerformance = new VendorPerformance({
              vendor: user._id,
              vendorType: account.vendorType || 'service'
            });
            await vendorPerformance.save();

            // Create Hotel record for hotel vendors
            if (account.vendorType === 'hotel') {
              const hotel = new Hotel({
                name: account.businessName || `${account.name}'s Hotel`,
                description: account.businessDescription || '',
                owner: user._id,
                email: account.email,
                phone: account.phone || '',
                checkInTime: '14:00',
                checkOutTime: '11:00'
              });
              await hotel.save();
            }

            // Create Restaurant record for restaurant vendors
            if (account.vendorType === 'restaurant') {
              const restaurant = new Restaurant({
                name: account.businessName || `${account.name}'s Restaurant`,
                description: account.businessDescription || '',
                owner: user._id,
                email: account.email,
                phone: account.phone || '',
                cuisine: 'Mixed'
              });
              await restaurant.save();
            }

            // Create Tour record for tour operators
            if (account.vendorType === 'tour-operator') {
              const tour = new Tour({
                name: account.businessName || `${account.name}'s Tours`,
                description: account.businessDescription || '',
                tourOperator: user._id,
                email: account.email,
                phone: account.phone || ''
              });
              await tour.save();
            }

            // Create Vendor profile for specific vendor types
            const vendorTypesWithProfile = ['furniture', 'hair', 'pets', 'gym-equipment'];
            if (vendorTypesWithProfile.includes(account.vendorType)) {
              const vendorProfile = new Vendor({
                owner: user._id,
                vendorType: account.vendorType,
                businessName: account.businessName || '',
                businessDescription: account.businessDescription || '',
                email: account.email,
                phone: account.phone || '',
                address: '',
                city: '',
                country: '',
                status: 'pending'
              });
              await vendorProfile.save();
            }

            console.log('✅ Created vendor records for:', account.email);
          } catch (error) {
            console.error('⚠️ Error creating vendor records for demo account:', error.message);
          }
        }
      } else {
        console.log('⏭️ Demo account already exists:', account.email);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Demo accounts setup complete',
      createdAccounts: createdUsers,
    });
  } catch (error) {
    console.error('❌ Error creating demo accounts:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reset demo accounts (delete and recreate)
router.post('/reset-demo-accounts', async (req, res) => {
  try {
    console.log('🔄 Resetting demo accounts...');

    // Delete existing demo account
    await User.deleteOne({ email: 'admin@demo.com' });
    console.log('🗑️ Deleted existing admin@demo.com');

    // Recreate with correct adminRole
    const superAdmin = new User({
      name: 'Super Admin',
      email: 'admin@demo.com',
      password: 'admin123456',
      phone: '+1234567890',
      userType: 'admin',
      adminRole: 'super-admin',
      adminPermissions: {
        manageOrganizations: true,
        manageUsers: true,
        manageDevices: true,
        processPayments: true,
        viewAnalytics: true,
        manageSettings: true,
        manageSuspensions: true,
        viewLogs: true
      }
    });

    await superAdmin.save();
    console.log('✅ Recreated admin@demo.com with adminRole: super-admin');

    res.status(200).json({
      success: true,
      message: 'Demo accounts reset successfully',
      data: { email: 'admin@demo.com', adminRole: 'super-admin' }
    });
  } catch (error) {
    console.error('❌ Error resetting demo accounts:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    // Validation
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'User ID, current password, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Find user
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log('✅ Password changed for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Password change error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
});

export default router;
