import mongoose from 'mongoose';

const SettlementSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vendorType: {
      type: String,
      enum: ['hotel', 'restaurant', 'retail', 'service', 'tours'],
      required: true
    },

    // Settlement Period
    period: {
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      }
    },

    // Financial Summary
    financialSummary: {
      totalRevenue: {
        type: Number,
        default: 0
      },
      totalBookings: {
        type: Number,
        default: 0
      },
      platformCommission: {
        type: Number,
        default: 0,
        description: 'Platform fee/commission percentage'
      },
      commissionAmount: {
        type: Number,
        default: 0,
        description: 'Actual commission amount calculated'
      },
      paymentGatewayFees: {
        type: Number,
        default: 0
      },
      refunds: {
        type: Number,
        default: 0
      },
      chargebacks: {
        type: Number,
        default: 0
      },
      adjustments: {
        type: Number,
        default: 0,
        description: 'Positive or negative adjustments'
      },
      netAmount: {
        type: Number,
        default: 0,
        description: 'Final amount after all deductions'
      }
    },

    // Transaction Details
    transactions: [
      {
        transactionId: String,
        bookingId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        date: Date,
        status: {
          type: String,
          enum: ['completed', 'pending', 'failed', 'refunded']
        }
      }
    ],

    // Payout Information
    payout: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payout'
      },
      amount: Number,
      method: {
        type: String,
        enum: ['bank-transfer', 'credit-card', 'crypto', 'other']
      },
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
      },
      scheduledDate: Date,
      processedDate: Date,
      referenceId: String
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending-review', 'approved', 'rejected', 'settled', 'disputed'],
      default: 'draft'
    },

    // Review & Approval
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    approvalNotes: String,
    rejectionReason: String,

    // Disputes
    disputes: [
      {
        description: String,
        amount: Number,
        status: {
          type: String,
          enum: ['open', 'under-review', 'resolved', 'escalated']
        },
        createdAt: Date,
        resolvedAt: Date,
        resolution: String
      }
    ],

    // Tax Information
    tax: {
      taxableAmount: Number,
      taxRate: Number,
      taxAmount: Number,
      taxId: String
    },

    // Attachments
    documents: [
      {
        type: String,
        url: String,
        uploadedAt: Date
      }
    ],

    // Notes
    notes: String,

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SettlementSchema.index({ vendor: 1, period: 1 });
SettlementSchema.index({ status: 1 });
SettlementSchema.index({ 'period.startDate': 1 });
SettlementSchema.index({ vendorType: 1 });

export default mongoose.model('Settlement', SettlementSchema);
