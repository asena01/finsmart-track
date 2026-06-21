import mongoose from 'mongoose';

const VendorPerformanceSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    vendorType: {
      type: String,
      enum: ['hotel', 'restaurant', 'retail', 'service', 'tours'],
      required: true
    },

    // Ratings
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      },
      distribution: {
        '5': { type: Number, default: 0 },
        '4': { type: Number, default: 0 },
        '3': { type: Number, default: 0 },
        '2': { type: Number, default: 0 },
        '1': { type: Number, default: 0 }
      }
    },

    // Reviews
    reviews: {
      total: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      averageSentiment: String
    },

    // Bookings
    bookings: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      cancellationRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      noShowRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },

    // Response Metrics
    responseTime: {
      average: Number, // in minutes
      lastWeek: Number,
      lastMonth: Number
    },
    responseRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // Customer Satisfaction
    satisfaction: {
      cleanliness: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 },
      checkIn: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 }
    },

    // Compliance Metrics
    violations: {
      total: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      pending: { type: Number, default: 0 }
    },
    verificationStatus: {
      active: Boolean,
      suspended: Boolean,
      blocked: Boolean,
      warning: Boolean,
      warningReason: String
    },

    // Revenue Metrics
    revenue: {
      total: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      lastMonth: { type: Number, default: 0 },
      thisYear: { type: Number, default: 0 },
      averagePerBooking: { type: Number, default: 0 }
    },

    // Occupancy (for hotels/tours)
    occupancy: {
      rate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      thisMonth: Number,
      thisYear: Number,
      trend: String // 'increasing', 'decreasing', 'stable'
    },

    // Operational Metrics
    operational: {
      listingQuality: { type: Number, min: 0, max: 100 },
      photoQuality: { type: Number, min: 0, max: 100 },
      descriptionQuality: { type: Number, min: 0, max: 100 },
      updatedAt: Date
    },

    // Monthly Performance History
    monthlyPerformance: [
      {
        month: Date,
        revenue: Number,
        bookings: Number,
        rating: Number,
        cancellations: Number,
        reviews: Number
      }
    ],

    // Metrics Last Updated
    lastUpdated: {
      type: Date,
      default: Date.now
    },

    // Performance Level
    performanceLevel: {
      type: String,
      enum: ['superhost', 'professional', 'standard', 'needs-improvement'],
      default: 'standard'
    },

    // Performance Badges
    badges: [
      {
        type: String,
        enum: ['superhost', 'fast-responder', 'highly-rated', 'verified-vendor', 'green-business']
      }
    ]
  },
  {
    timestamps: true
  }
);

// Index for faster queries
VendorPerformanceSchema.index({ vendor: 1 });
VendorPerformanceSchema.index({ 'rating.average': -1 });
VendorPerformanceSchema.index({ performanceLevel: 1 });
VendorPerformanceSchema.index({ 'verificationStatus.suspended': 1 });

export default mongoose.model('VendorPerformance', VendorPerformanceSchema);
