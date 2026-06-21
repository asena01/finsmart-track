import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const { Schema } = mongoose;

const StaffSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: String,
  position: {
    type: String,
    enum: ['manager', 'receptionist', 'housekeeping', 'housekeeper', 'chef', 'waiter', 'bellboy', 'maintenance', 'security', 'other'],
    required: true
  },
  department: {
    type: String,
    enum: ['front-office', 'housekeeping', 'kitchen', 'restaurant', 'maintenance', 'security', 'admin'],
    required: true
  },
  salary: Number,
  joinDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave'],
    default: 'active'
  },
  accessRole: {
    type: String,
    enum: ['admin', 'operations', 'front-desk', 'housekeeping', 'food-service', 'maintenance', 'security', 'custom'],
    default: 'operations'
  },
  allowedModules: [{
    type: String,
    enum: ['overview', 'bookings', 'rooms', 'guests', 'revenue', 'analytics', 'food-orders', 'food-menu', 'maintenance', 'housekeeping', 'pre-checkin', 'staff', 'services', 'chat']
  }],
  allowedAreas: [{
    type: String,
    enum: ['front-desk', 'lobby', 'guest-rooms', 'restaurant', 'kitchen', 'maintenance', 'security', 'admin-office', 'spa-services']
  }],
  permissions: {
    canManageBookings: {
      type: Boolean,
      default: false
    },
    canManageRooms: {
      type: Boolean,
      default: false
    },
    canManageOrders: {
      type: Boolean,
      default: false
    },
    canViewRevenue: {
      type: Boolean,
      default: false
    },
    canViewAnalytics: {
      type: Boolean,
      default: false
    },
    canManageStaff: {
      type: Boolean,
      default: false
    },
    canHandleMaintenance: {
      type: Boolean,
      default: false
    }
  },
  mustChangePassword: {
    type: Boolean,
    default: true
  },
  temporaryPasswordIssuedAt: Date,
  address: String,
  city: String,
  emergencyContact: String,
  emergencyPhone: String,
  profileImage: String,
  password: String,
  lastLogin: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

StaffSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

StaffSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

StaffSchema.index({ hotel: 1, email: 1 });

export default mongoose.model('Staff', StaffSchema);
