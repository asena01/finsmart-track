import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      required: true
    },
    productId: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['low-stock', 'out-of-stock', 'high-demand', 'price-change'],
      required: true
    },
    threshold: {
      type: Number,
      default: 10
    },
    currentValue: {
      type: Number,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    action: {
      type: String,
      enum: ['reorder', 'review', 'promote', 'none'],
      default: 'none'
    },
    actionTaken: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

alertSchema.index({ vendorId: 1 });
alertSchema.index({ read: 1 });
alertSchema.index({ createdAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
