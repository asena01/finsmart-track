import mongoose from 'mongoose';

const PayoutSchema = new mongoose.Schema(
  {
    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settlement',
      required: true
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Payout Details
    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: 'USD'
    },

    method: {
      type: String,
      enum: ['bank-transfer', 'wire-transfer', 'credit-card', 'crypto', 'check', 'other'],
      required: true
    },

    // Bank Details for Transfer
    bankAccount: {
      accountHolderName: String,
      accountNumber: String,
      routingNumber: String,
      bankName: String,
      swiftCode: String,
      iban: String,
      accountType: {
        type: String,
        enum: ['checking', 'savings', 'business']
      }
    },

    // Status & Tracking
    status: {
      type: String,
      enum: ['scheduled', 'pending', 'processing', 'completed', 'failed', 'cancelled', 'disputed'],
      default: 'scheduled'
    },

    // Dates
    scheduledDate: {
      type: Date,
      required: true
    },

    processedDate: Date,
    completedDate: Date,
    failedDate: Date,

    // Processing Details
    processor: {
      type: String,
      enum: ['stripe', 'paypal', 'manual', 'crypto-gateway', 'other']
    },

    processorReferenceId: String,
    trackingNumber: String,

    // Failure Information
    failureReason: String,
    failureCode: String,
    retryCount: {
      type: Number,
      default: 0
    },

    maxRetries: {
      type: Number,
      default: 3
    },

    // Fees
    processingFee: {
      type: Number,
      default: 0
    },

    netAmount: {
      type: Number,
      computed: true
    },

    // Verification
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    verifiedAt: Date,

    // Approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    approvedAt: Date,

    // Notes & Comments
    notes: String,
    internalNotes: String,

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    tags: [String],

    // Callback URL for webhook
    webhookUrl: String,
    lastWebhookAttempt: Date
  },
  {
    timestamps: true
  }
);

// Calculate net amount
PayoutSchema.virtual('calculatedNetAmount').get(function() {
  return this.amount - (this.processingFee || 0);
});

// Indexes
PayoutSchema.index({ vendor: 1, status: 1 });
PayoutSchema.index({ settlement: 1 });
PayoutSchema.index({ scheduledDate: 1 });
PayoutSchema.index({ status: 1 });
PayoutSchema.index({ processor: 1 });

export default mongoose.model('Payout', PayoutSchema);
