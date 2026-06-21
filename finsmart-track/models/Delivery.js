import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema(
  {
    // Order & Provider Info
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Delivery Partner Assignment
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPartner',
      required: true
    },
    deliveryAgentId: String, // Individual driver/agent ID
    deliveryAgentName: String,
    deliveryAgentPhone: String,

    // Location Information
    pickupLocation: {
      name: String,
      address: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    deliveryLocation: {
      name: String,
      address: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      deliveryInstructions: String
    },

    // Zone Information
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryZone'
    },
    zoneName: String,

    // Delivery Details
    deliveryType: {
      type: String,
      enum: ['standard', 'express', 'scheduled'],
      default: 'standard'
    },
    scheduledDeliveryTime: Date, // For scheduled deliveries

    // Package Information
    packageDetails: {
      weight: {
        value: Number,
        unit: { type: String, default: 'kg' }
      },
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: { type: String, default: 'cm' }
      },
      itemCount: Number,
      description: String,
      specialHandling: [String] // e.g., ['fragile', 'refrigerated']
    },

    // Pricing
    deliveryCost: {
      baseCost: Number,
      distanceFee: Number,
      zoneSurcharge: Number,
      rushCharges: Number,
      otherCharges: Number,
      total: Number,
      currency: { type: String, default: 'USD' }
    },

    // Tracking & Status
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'assigned',
        'picked-up',
        'in-transit',
        'out-for-delivery',
        'delivered',
        'failed',
        'cancelled',
        'returned'
      ],
      default: 'pending',
      index: true
    },

    // Timeline
    timeline: {
      createdAt: { type: Date, default: Date.now },
      confirmedAt: Date,
      assignedAt: Date,
      pickedUpAt: Date,
      deliveredAt: Date,
      failedAt: Date,
      estimatedDeliveryTime: Date
    },

    // Real-time Tracking
    trackingHistory: [
      {
        status: String,
        location: {
          latitude: Number,
          longitude: Number
        },
        timestamp: { type: Date, default: Date.now },
        notes: String
      }
    ],

    // Proof of Delivery
    proofOfDelivery: {
      signature: String, // URL to signature image
      photo: String, // URL to delivery photo
      recipientName: String,
      notes: String,
      timestamp: Date
    },

    // Issues & Exceptions
    issues: [
      {
        type: String, // 'delivery-failed', 'customer-not-found', 'address-incorrect'
        description: String,
        resolution: String,
        resolvedAt: Date
      }
    ],

    // Communication
    customerCommunication: [
      {
        type: String, // 'sms', 'email', 'call'
        status: String,
        sentAt: Date,
        content: String
      }
    ],

    // Ratings & Feedback
    rating: {
      customerRating: {
        score: { type: Number, min: 1, max: 5 },
        comment: String,
        ratedAt: Date
      },
      partnerRating: {
        score: { type: Number, min: 1, max: 5 },
        comment: String,
        ratedAt: Date
      }
    },

    // Insurance & Liability
    insurance: {
      declaredValue: Number,
      insured: Boolean,
      claimFiled: Boolean,
      claimAmount: Number
    },

    // Metadata
    notes: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

deliverySchema.index({ status: 1, createdAt: -1 });
deliverySchema.index({ providerId: 1, customerId: 1 });
deliverySchema.index({ deliveryPartnerId: 1 });
deliverySchema.index({ 'timeline.deliveredAt': 1 });

const Delivery = mongoose.model('Delivery', deliverySchema);
export default Delivery;
