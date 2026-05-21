import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide organization name'],
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['hotel', 'restaurant', 'retail', 'service', 'tour-operator'],
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    website: String,
    description: String,
    logo: String,
    banner: String,
    
    // Business metrics
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalTransactions: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    
    // Status and verification
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending-verification'],
      default: 'pending-verification',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDate: Date,
    
    // Subscription
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    subscriptionExpiry: Date,
    
    // Settings
    settings: {
      enableNotifications: {
        type: Boolean,
        default: true,
      },
      enableAnalytics: {
        type: Boolean,
        default: true,
      },
      commission: {
        type: Number,
        default: 5, // percentage
      },
    },
    
    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
