import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    businessType: {
      type: String,
      enum: ['restaurant', 'retail', 'hotel', 'service', 'delivery', 'tours'],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    postalCode: {
      type: String,
      default: null,
    },
    totalPurchases: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    averageOrderValue: {
      type: Number,
      default: 0,
    },
    lastPurchaseDate: {
      type: Date,
      default: null,
    },
    firstPurchaseDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'vip', 'blocked'],
      default: 'active',
    },
    notes: {
      type: String,
      default: null,
    },
    preferences: {
      newsletter: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
customerSchema.index({ businessId: 1, status: 1 });
customerSchema.index({ businessId: 1, totalSpent: -1 });
customerSchema.index({ businessId: 1, lastPurchaseDate: -1 });
customerSchema.index({ email: 1, businessId: 1 });

export default mongoose.model('Customer', customerSchema);
