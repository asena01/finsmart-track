import mongoose from 'mongoose';

const deliveryConfigurationSchema = new mongoose.Schema(
  {
    // Vendor/Provider Info
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    providerType: {
      type: String,
      enum: [
        'furniture',
        'hair',
        'pets',
        'gym-equipment',
        'restaurant',
        'hotel',
        'retail',
        'service',
        'tour-operator',
        'salon-spa'
      ],
      required: true
    },
    businessName: String,

    // Delivery Partners Assignment (Multiple partners allowed)
    selectedDeliveryPartners: [
      {
        partnerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'DeliveryPartner'
        },
        isDefault: { type: Boolean, default: false }, // Default partner for auto-assignment
        priority: { type: Number, default: 0 }, // Priority order (0 = highest)
        addedAt: { type: Date, default: Date.now }
      }
    ],

    // Delivery Options Offered by this Provider
    offerDelivery: { type: Boolean, default: true },
    deliveryOptions: [
      {
        name: String, // 'standard', 'express', 'scheduled'
        enabled: { type: Boolean, default: true },
        deliveryTimeMin: Number,
        deliveryTimeMax: Number,
        timeUnit: { type: String, default: 'hours' },
        priceMultiplier: { type: Number, default: 1.0 }
      }
    ],

    // Delivery Coverage Areas
    serviceCoverage: [
      {
        areaName: String,
        zoneId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'DeliveryZone'
        },
        enabled: { type: Boolean, default: true },
        minDeliveryTime: Number,
        maxDeliveryTime: Number,
        customPricing: Number // Override zone pricing if needed
      }
    ],

    // Address Information for Delivery
    businessAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },

    // Business Hours (for delivery pickup)
    businessHours: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean }
    },

    // Delivery Policies
    policies: {
      minOrderValue: Number,
      maxOrderValue: Number,
      freeDeliveryAbove: Number,
      cancelationPolicy: String, // 'free-before-24h', 'full-cost', etc.
      refundPolicy: String
    },

    // Packaging & Preparation
    packaging: {
      requiresSpecialPackaging: Boolean,
      packagingCost: Number,
      estimatedPrepTime: {
        value: Number,
        unit: { type: String, default: 'minutes' }
      }
    },

    // Performance Settings
    maxConcurrentDeliveries: Number,
    priorityBusy: Boolean, // Temporary pause accepting deliveries

    // Integration Settings
    autoAcceptDelivery: { type: Boolean, default: true },
    notificationPreferences: {
      emailNotification: { type: Boolean, default: true },
      smsNotification: { type: Boolean, default: true },
      pushNotification: { type: Boolean, default: true }
    },

    // Delivery Partner Communication
    partnerNotes: String, // Special instructions for delivery partner

    // Pricing Customization
    customPricingRules: [
      {
        ruleType: String, // 'weight-based', 'distance-based', 'time-based'
        condition: String, // e.g., 'weight > 10kg'
        surcharge: Number,
        multiplier: Number
      }
    ],

    // Statistics & Performance
    stats: {
      totalDeliveries: { type: Number, default: 0 },
      successfulDeliveries: { type: Number, default: 0 },
      failedDeliveries: { type: Number, default: 0 },
      averageDeliveryTime: Number,
      customerSatisfactionRating: { type: Number, default: 0 },
      complaintCount: { type: Number, default: 0 }
    },

    // Activation & Status
    isActive: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastModifiedBy: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true }
);

deliveryConfigurationSchema.index({ providerId: 1 });
deliveryConfigurationSchema.index({ selectedDeliveryPartner: 1 });
deliveryConfigurationSchema.index({ providerType: 1 });
deliveryConfigurationSchema.index({ isActive: 1 });

const DeliveryConfiguration = mongoose.model('DeliveryConfiguration', deliveryConfigurationSchema);
export default DeliveryConfiguration;
