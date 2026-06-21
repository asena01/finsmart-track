import mongoose from 'mongoose';

const integratedDeliverySchema = new mongoose.Schema(
  {
    // Reference to order being delivered
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOrder',
      required: true,
      index: true
    },

    // Restaurant/Business info
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    businessType: {
      type: String,
      enum: ['restaurant', 'retail', 'hotel', 'service', 'warehouse'],
      required: true
    },

    // Integration reference
    integrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessDeliveryIntegration',
      required: true
    },

    // Delivery provider
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPartner',
      required: true
    },

    providerServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryProviderService',
      required: true
    },

    // Delivery details
    pickupLocation: {
      address: {
        type: String,
        required: true
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      contactPerson: String,
      contactPhone: String
    },

    deliveryLocation: {
      address: {
        type: String,
        required: true
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      contactPerson: String,
      contactPhone: String
    },

    // Order info
    items: [
      {
        name: String,
        quantity: Number,
        price: Number
      }
    ],

    totalAmount: {
      type: Number,
      required: true
    },

    // Delivery pricing
    deliveryPrice: {
      basePrice: Number,
      distanceCharge: Number,
      weightCharge: Number,
      tax: Number,
      total: {
        type: Number,
        required: true
      }
    },

    // Status tracking
    status: {
      type: String,
      enum: [
        'pending',           // Awaiting pickup
        'confirmed',         // Provider confirmed
        'picking_up',        // Driver en route to pickup
        'picked_up',         // Order picked up
        'out_for_delivery',  // Driver delivering
        'delivered',         // Delivered successfully
        'failed',            // Delivery failed
        'cancelled'          // Cancelled
      ],
      default: 'pending',
      index: true
    },

    // Assignment info
    assignedDriver: {
      driverId: mongoose.Schema.Types.ObjectId,
      driverName: String,
      driverPhone: String,
      vehicleType: String,
      vehicleNumber: String
    },

    // Tracking
    tracking: {
      pickupTime: Date,
      deliveryTime: Date,
      estimatedDeliveryTime: Date,
      currentLocation: {
        latitude: Number,
        longitude: Number,
        timestamp: Date
      },
      trackingHistory: [
        {
          status: String,
          location: {
            latitude: Number,
            longitude: Number
          },
          timestamp: { type: Date, default: Date.now }
        }
      ]
    },

    // Ratings & feedback
    customerRating: {
      type: Number,
      min: 1,
      max: 5
    },

    customerFeedback: String,

    // Proof of delivery
    proofOfDelivery: {
      signature: String,
      photo: String,
      timestamp: Date
    },

    // Notes
    notes: String,
    cancelReason: String,

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

// Indexes for efficient queries
integratedDeliverySchema.index({ businessId: 1, status: 1 });
integratedDeliverySchema.index({ providerId: 1, status: 1 });
integratedDeliverySchema.index({ createdAt: -1 });
integratedDeliverySchema.index({ 'tracking.currentLocation': '2dsphere' });

const IntegratedDelivery = mongoose.model('IntegratedDelivery', integratedDeliverySchema);
export default IntegratedDelivery;
