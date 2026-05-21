import mongoose from 'mongoose';

const VendorChatSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bookingId: {
      type: String,
      required: false
    },
    orderId: {
      type: String,
      required: false
    },
    vendorId: {
      type: String,
      required: true,
      index: true
    },
    vendorName: {
      type: String,
      required: true
    },
    vendorType: {
      type: String,
      enum: ['hotel', 'restaurant', 'retail', 'service', 'tour', 'delivery'],
      required: true
    },
    vendorIcon: {
      type: String,
      default: '💬'
    },
    subject: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'pending'],
      default: 'open'
    },
    unreadForCustomer: {
      type: Number,
      default: 0
    },
    unreadForVendor: {
      type: Number,
      default: 0
    },
    lastReadAtCustomer: {
      type: Date,
      default: null
    },
    lastReadAtVendor: {
      type: Date,
      default: null
    },
    messages: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        sender: {
          type: String,
          enum: ['customer', 'vendor'],
          required: true
        },
        senderName: {
          type: String,
          required: true
        },
        message: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        read: {
          type: Boolean,
          default: false
        }
      }
    ],
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

// Index for efficient queries
VendorChatSchema.index({ customerId: 1, createdAt: -1 });
VendorChatSchema.index({ vendorId: 1, customerId: 1 });

export default mongoose.model('VendorChat', VendorChatSchema);
