import mongoose from 'mongoose';

const businessDeliveryIntegrationSchema = new mongoose.Schema(
  {
    // Business/Vendor info
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    businessType: {
      type: String,
      enum: ['restaurant', 'retail', 'hotel', 'service', 'warehouse'],
      required: true,
      index: true
    },

    // Delivery Provider/Service info
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPartner',
      required: true,
      index: true
    },

    providerServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryProviderService',
      required: true
    },

    // Integration Status
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'suspended'],
      default: 'active',
      index: true
    },

    // Custom Configuration
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    apiKey: String,
    webhookUrl: String,

    customPricing: {
      basePrice: Number,
      perKmRate: Number,
      markupPercentage: { type: Number, default: 0 }
    },

    // Contract
    contractStartDate: {
      type: Date,
      default: Date.now
    },

    contractEndDate: Date,
    autoRenew: { type: Boolean, default: true },

    // Performance Metrics
    totalOrders: {
      type: Number,
      default: 0
    },

    successfulOrders: {
      type: Number,
      default: 0
    },

    successRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },

    averageDeliveryTime: {
      type: Number, // in minutes
      default: 0
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    // Default service for this business
    isDefault: {
      type: Boolean,
      default: false
    },

    // Usage stats
    monthlyOrderCount: {
      type: Number,
      default: 0
    },

    monthlyRevenue: {
      type: Number,
      default: 0
    },

    // Notes & feedback
    notes: String,
    feedback: String,

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

// Indexes
businessDeliveryIntegrationSchema.index({ businessId: 1, status: 1 });
businessDeliveryIntegrationSchema.index({ providerId: 1, status: 1 });
businessDeliveryIntegrationSchema.index({ businessId: 1, isDefault: 1 });

const BusinessDeliveryIntegration = mongoose.model(
  'BusinessDeliveryIntegration',
  businessDeliveryIntegrationSchema
);

export default BusinessDeliveryIntegration;
