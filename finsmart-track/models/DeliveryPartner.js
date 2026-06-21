import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      index: true
    },
    description: String,
    logo: String,
    website: String,
    phone: String,
    email: String,

    // Service Area
    serviceAreas: [
      {
        city: String,
        state: String,
        country: String,
        coordinates: {
          latitude: Number,
          longitude: Number
        },
        radius: Number // in km
      }
    ],

    // Coverage & Availability
    operatingHours: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    },
    holidays: [Date], // Closed on these dates

    // Delivery Capabilities
    capabilities: {
      maxWeight: {
        value: Number,
        unit: { type: String, default: 'kg' }
      },
      maxItems: Number,
      availableVehicles: [String], // e.g., ['bike', 'car', 'truck']
      refrigerated: { type: Boolean, default: false },
      fragileItemsHandling: { type: Boolean, default: false }
    },

    // Delivery Times
    standardDeliveryTime: {
      min: Number,
      max: Number,
      unit: { type: String, default: 'hours' }
    },
    expressDeliveryTime: {
      min: Number,
      max: Number,
      unit: { type: String, default: 'hours' }
    },

    // Pricing Strategy
    pricingModel: {
      type: String,
      enum: ['zone-based', 'distance-based', 'hybrid'],
      default: 'hybrid'
    },

    // Performance Metrics
    metrics: {
      averageDeliveryTime: Number, // in minutes
      onTimePercentage: { type: Number, default: 95 },
      customerRating: { type: Number, default: 0 },
      totalDeliveries: { type: Number, default: 0 },
      successfulDeliveries: { type: Number, default: 0 },
      reviews: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          userName: String,
          rating: Number,
          comment: String,
          createdAt: { type: Date, default: Date.now }
        }
      ]
    },

    // Bank & Payment Info
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      swiftCode: String,
      routingNumber: String
    },

    // Verification & Compliance
    isVerified: { type: Boolean, default: false },
    verificationDocuments: [String], // URLs to license, insurance, etc.
    insuranceProvider: String,
    insuranceExpiry: Date,
    businessLicense: String,

    // Status & Management
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending-verification'],
      default: 'pending-verification'
    },
    activeProviders: { type: Number, default: 0 }, // Number of vendors using this delivery partner
    supportContact: {
      email: String,
      phone: String,
      hours: String
    },

    // API Integration (for real-time tracking)
    apiIntegration: {
      enabled: { type: Boolean, default: false },
      apiKey: String,
      webhookUrl: String,
      trackingFormat: String // e.g., 'rest', 'webhook'
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    tags: [String]
  },
  { timestamps: true }
);

deliveryPartnerSchema.index({ name: 'text', description: 'text' });
deliveryPartnerSchema.index({ status: 1 });
deliveryPartnerSchema.index({ isVerified: 1 });

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
export default DeliveryPartner;
