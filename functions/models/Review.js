import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    productName: {
      type: String,
      default: null,
    },
    roomNumber: {
      type: String,
      default: null,
    },
    checkInDate: {
      type: Date,
      default: null,
    },
    checkOutDate: {
      type: Date,
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    images: [String],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    unHelpfulCount: {
      type: Number,
      default: 0,
    },
    vendorResponse: {
      text: {
        type: String,
        default: null,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
reviewSchema.index({ businessId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ businessId: 1, rating: 1 });
reviewSchema.index({ productId: 1, status: 1 });

export default mongoose.model('Review', reviewSchema);
