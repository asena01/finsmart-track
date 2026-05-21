import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    profileImage: {
      type: String,
      default: '',
    },
    userType: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      default: 'customer',
    },
    adminRole: {
      type: String,
      enum: [
        null,
        'super-admin',
        'admin',
        'moderator',
        'support',
        'finance-manager',
        'compliance-officer',
        'support-manager',
        'vendor-manager'
      ],
      default: null,
    },
    adminPermissions: {
      manageOrganizations: {
        type: Boolean,
        default: false,
      },
      manageUsers: {
        type: Boolean,
        default: false,
      },
      manageDevices: {
        type: Boolean,
        default: false,
      },
      processPayments: {
        type: Boolean,
        default: false,
      },
      viewAnalytics: {
        type: Boolean,
        default: false,
      },
      manageSettings: {
        type: Boolean,
        default: false,
      },
      manageSuspensions: {
        type: Boolean,
        default: false,
      },
      viewLogs: {
        type: Boolean,
        default: false,
      },
    },
    vendorType: {
      type: String,
      enum: [
        null,
        'restaurant',
        'hotel',
        'retail',
        'service',
        'tour-operator',
        'delivery',
        'clothing-store',
        'jewelry',
        'supermarket',
        'furniture',
        'hair-salon',
        'pet-store',
        'gym',
        'car-rental',
        'salon-spa',
        'event-center',
        'general',
        'hair',
        'pets',
        'gym-equipment'
      ],
      default: null,
    },
    businessName: {
      type: String,
      default: '',
    },
    businessDescription: {
      type: String,
      default: '',
    },
    businessImage: {
      type: String,
      default: '',
    },
    cuisineType: [String], // For restaurants: e.g., ['French', 'International']
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Reference to DeliveryPartner (for delivery vendors)
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPartner',
      default: null,
    },
    // Vendor status
    status: {
      type: String,
      enum: ['pending', 'verified', 'active', 'suspended', 'blocked'],
      default: 'pending',
    },
    // KYC/Verification status
    kycStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (passwordToCheck) {
  return await bcrypt.compare(passwordToCheck, this.password);
};

// Remove password from response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
