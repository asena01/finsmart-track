import mongoose from 'mongoose';

const courierSchema = new mongoose.Schema(
  {
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery',
      required: true,
    },
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    name: {
      type: String,
      required: [true, 'Please provide courier name'],
      trim: true,
    },
    
    email: {
      type: String,
      lowercase: true,
    },
    
    phone: {
      type: String,
      required: true,
    },
    
    // License and documents
    licenseNumber: String,
    licenseExpiry: Date,
    insuranceNumber: String,
    insuranceExpiry: Date,
    backgroundCheckDate: Date,
    
    // Vehicle information
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'car', 'van', 'truck'],
      required: true,
    },
    
    vehiclePlate: String,
    vehicleModel: String,
    vehicleYear: Number,
    vehicleColor: String,
    
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-break', 'suspended'],
      default: 'inactive',
    },
    
    isOnline: {
      type: Boolean,
      default: false,
    },
    
    isAvailable: {
      type: Boolean,
      default: false,
    },
    
    // Current location
    currentLocation: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: [Number], // [longitude, latitude]
      lastUpdated: Date,
    },
    
    // Statistics
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    
    avgDeliveryTime: {
      type: Number,
      default: 0,
    },
    
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    
    acceptanceRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    
    cancellationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    // Availability
    workingHours: {
      startTime: String,
      endTime: String,
      daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    },
    
    // Bank details for payments
    bankAccount: {
      accountName: String,
      accountNumber: String,
      bankCode: String,
      routingNumber: String,
    },
    
    // Emergency contact
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    
    // Settings
    settings: {
      maxOrders: {
        type: Number,
        default: 10,
      },
      acceptOrdersAutomatically: {
        type: Boolean,
        default: false,
      },
      notificationPreference: {
        type: String,
        enum: ['sms', 'push', 'both'],
        default: 'both',
      },
    },
    
    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    verificationDate: Date,
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create geospatial index for location-based queries
courierSchema.index({ 'currentLocation': '2dsphere' });

export default mongoose.model('Courier', courierSchema);
