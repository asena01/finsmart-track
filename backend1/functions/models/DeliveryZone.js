import mongoose from 'mongoose';

const deliveryZoneSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      index: true
    },
    description: String,

    // Geographic Boundaries
    location: {
      city: String,
      state: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      // Polygon for more precise area definition (optional)
      polygon: {
        type: {
          type: String,
          enum: ['Polygon'],
          default: 'Polygon'
        },
        coordinates: [[[Number]]] // Array of coordinates forming polygon
      }
    },

    // Zone Category (for easy identification)
    category: {
      type: String,
      enum: ['urban', 'suburban', 'rural', 'downtown', 'airport', 'commercial'],
      default: 'urban'
    },

    // Base Pricing for this zone
    basePricing: {
      basePrice: {
        value: Number,
        currency: { type: String, default: 'USD' }
      },
      minPrice: Number, // Minimum charge for any delivery in this zone
      maxPrice: Number, // Cap on delivery price in this zone
      freeDeliveryAbove: Number // Free delivery if order value exceeds this
    },

    // Distance-based Additional Pricing
    distancePricing: {
      enabled: { type: Boolean, default: true },
      pricePerKm: {
        value: Number,
        currency: { type: String, default: 'USD' }
      },
      radiusKm: Number // Delivery radius from zone center
    },

    // Delivery Partner Surcharges (per partner in this zone)
    partnerSurcharges: [
      {
        deliveryPartnerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'DeliveryPartner'
        },
        surcharge: Number, // Additional charge for this partner in this zone
        maxDeliveries: Number, // Max concurrent deliveries in this zone
        currentDeliveries: { type: Number, default: 0 }
      }
    ],

    // Delivery Time Estimates
    deliveryTimeEstimates: {
      standard: {
        min: Number,
        max: Number,
        unit: { type: String, default: 'hours' }
      },
      express: {
        min: Number,
        max: Number,
        unit: { type: String, default: 'minutes' }
      }
    },

    // Peak Hours (surge pricing or longer delivery times)
    peakHours: [
      {
        day: String, // 'monday', 'tuesday', etc.
        startTime: String, // '18:00'
        endTime: String, // '21:00'
        surgeMultiplier: {
          type: Number,
          default: 1.2 // 20% increase
        }
      }
    ],

    // Service Level Options Available in Zone
    serviceOptions: [
      {
        name: String, // 'standard', 'express', 'scheduled'
        description: String,
        deliveryTimeMin: Number,
        deliveryTimeMax: Number,
        priceMultiplier: Number // 1 = base price, 1.5 = 50% more
      }
    ],

    // Availability & Status
    isActive: { type: Boolean, default: true },
    availableDeliveryPartners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner'
      }
    ],
    preferredPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPartner'
    },

    // Statistics
    stats: {
      totalDeliveries: { type: Number, default: 0 },
      averageDeliveryTime: Number,
      averageRating: { type: Number, default: 0 },
      issuesReported: { type: Number, default: 0 }
    },

    // Restrictions
    restrictions: {
      prohibitedItems: [String], // Items that can't be delivered in this zone
      maxOrderValue: Number,
      minOrderValue: Number,
      requiresSignature: Boolean,
      ageRestrictedItems: Boolean
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

deliveryZoneSchema.index({ 'location.city': 1, 'location.country': 1 });
deliveryZoneSchema.index({ isActive: 1 });
deliveryZoneSchema.index({ category: 1 });

const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
export default DeliveryZone;
