import mongoose from 'mongoose';

const PayoutScheduleSchema = new mongoose.Schema(
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

    // Schedule Configuration
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'manual'],
      default: 'monthly'
    },

    // Specific Day/Date for Payouts
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      description: '0=Sunday, 6=Saturday (for weekly)'
    },

    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      description: 'For monthly or quarterly'
    },

    // Auto-Payout Settings
    autoPayoutEnabled: {
      type: Boolean,
      default: true
    },

    minimumThreshold: {
      type: Number,
      default: 0,
      description: 'Minimum amount before payout is triggered'
    },

    // Method Preference
    preferredMethod: {
      type: String,
      enum: ['bank-transfer', 'wire-transfer', 'credit-card', 'crypto', 'check', 'other'],
      default: 'bank-transfer'
    },

    // Hold Period (in days)
    holdPeriod: {
      type: Number,
      default: 3,
      description: 'Days to hold funds before payout'
    },

    // Hold Reason
    holdReason: {
      type: String,
      enum: ['platform-policy', 'compliance-review', 'vendor-request', 'none'],
      default: 'none'
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },

    // Suspension Details
    suspendedAt: Date,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    suspensionReason: String,

    // Last Payout Information
    lastPayoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payout'
    },

    lastPayoutDate: Date,
    lastPayoutAmount: Number,

    // Next Scheduled Payout
    nextPayoutDate: Date,
    nextPayoutEstimatedAmount: Number,

    // Statistics
    statistics: {
      totalPayoutsCompleted: {
        type: Number,
        default: 0
      },
      totalPayoutsFailed: {
        type: Number,
        default: 0
      },
      totalPayoutAmount: {
        type: Number,
        default: 0
      },
      averagePayoutAmount: Number,
      averageProcessingTime: Number // in minutes
    },

    // Rate Limiting
    maxPayoutFrequency: {
      type: String,
      enum: ['unlimited', 'daily', 'weekly', 'monthly'],
      default: 'unlimited'
    },

    // Payout History
    payoutHistory: [
      {
        payoutId: mongoose.Schema.Types.ObjectId,
        date: Date,
        amount: Number,
        status: String
      }
    ],

    // Configuration History
    configHistory: [
      {
        changedAt: Date,
        changedBy: mongoose.Schema.Types.ObjectId,
        previousFrequency: String,
        newFrequency: String,
        reason: String
      }
    ],

    // Notes
    notes: String,

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
PayoutScheduleSchema.index({ vendor: 1 });
PayoutScheduleSchema.index({ frequency: 1 });
PayoutScheduleSchema.index({ nextPayoutDate: 1 });
PayoutScheduleSchema.index({ isActive: 1 });

export default mongoose.model('PayoutSchedule', PayoutScheduleSchema);
