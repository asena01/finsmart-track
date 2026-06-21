import mongoose from 'mongoose';

const deliveryProviderServiceSchema = new mongoose.Schema(
  {
    // Provider Reference
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPartner',
      required: true,
      index: true
    },

    // Service Information
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ''
    },

    category: {
      type: String,
      enum: ['food', 'retail', 'furniture', 'packages', 'pharmacy', 'grocery', 'luggage', 'perishable', 'other'],
      required: true,
      index: true
    },

    // Pricing
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },

    perKmRate: {
      type: Number,
      required: true,
      min: 0
    },

    perKgRate: {
      type: Number,
      default: null,
      min: 0
    },

    // Delivery Constraints
    estimatedDeliveryTime: {
      type: Number, // in minutes
      required: true,
      min: 1
    },

    maxDistance: {
      type: Number, // in km
      default: null,
      min: 1
    },

    maxWeight: {
      type: Number, // in kg
      default: null,
      min: 0.1
    },

    // Features
    features: {
      realTimeTracking: {
        type: Boolean,
        default: false
      },
      insurance: {
        type: Boolean,
        default: false
      },
      temperature_control: {
        type: Boolean,
        default: false
      },
      signature_required: {
        type: Boolean,
        default: false
      },
      scheduled_delivery: {
        type: Boolean,
        default: false
      }
    },

    // Service Coverage
    coverage: {
      type: [String], // Array of cities/areas
      default: []
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Statistics
    stats: {
      totalOrders: {
        type: Number,
        default: 0
      },
      successfulOrders: {
        type: Number,
        default: 0
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      successRate: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
      }
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for efficient queries
deliveryProviderServiceSchema.index({ providerId: 1, category: 1 });
deliveryProviderServiceSchema.index({ providerId: 1, isActive: 1 });
deliveryProviderServiceSchema.index({ category: 1, isActive: 1 });

const DeliveryProviderService = mongoose.model('DeliveryProviderService', deliveryProviderServiceSchema);
export default DeliveryProviderService;
