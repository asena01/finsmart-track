import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    
    // Parties involved
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Transaction details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    },
    
    // Commission and fees
    platformCommission: {
      type: Number,
      default: 0,
    },
    paymentGatewayFee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    
    // Type and category
    type: {
      type: String,
      enum: ['booking', 'purchase', 'service', 'refund', 'commission', 'withdrawal'],
      required: true,
    },
    
    // Related reference
    referenceId: String, // booking ID, order ID, etc.
    referenceType: {
      type: String,
      enum: ['booking', 'order', 'food-order', 'tour-package', 'service-booking'],
    },
    
    // Payment method
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'wallet', 'stripe', 'paypal'],
      required: true,
    },
    paymentGateway: String, // Stripe, PayPal, etc.
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    
    // Description and notes
    description: String,
    notes: String,
    
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Dates
    processedDate: Date,
    completedDate: Date,
    refundedDate: Date,
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);
