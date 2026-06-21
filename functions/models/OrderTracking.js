import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    required: true
  },
  statusLabel: String, // Readable label like "Order Confirmed"
  description: String, // Detailed description
  location: String, // Tracking location (city, facility, etc.)
  timestamp: {
    type: Date,
    default: Date.now
  },
  eventType: {
    type: String,
    enum: ['status_update', 'location_update', 'delay', 'exception', 'delivery_note'],
    default: 'status_update'
  }
});

const orderTrackingSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    trackingNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    vendorId: {
      type: String,
      required: true,
      index: true
    },
    currentStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
      default: 'pending'
    },
    currentLocation: {
      type: String,
      default: null
    },
    estimatedDelivery: {
      type: Date,
      default: null
    },
    actualDelivery: {
      type: Date,
      default: null
    },
    carrierName: {
      type: String,
      default: null
    },
    carrierTrackingUrl: {
      type: String,
      default: null
    },
    shippingMethod: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'pickup'],
      default: 'standard'
    },
    events: [trackingEventSchema],
    signature: {
      signedBy: String,
      timestamp: Date,
      location: String,
      notes: String
    },
    estimatedDays: {
      type: Number,
      default: 5
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes
orderTrackingSchema.index({ orderId: 1 });
orderTrackingSchema.index({ trackingNumber: 1 });
orderTrackingSchema.index({ customerId: 1, createdAt: -1 });
orderTrackingSchema.index({ vendorId: 1, currentStatus: 1 });
orderTrackingSchema.index({ 'events.timestamp': -1 });

const OrderTracking = mongoose.model('OrderTracking', orderTrackingSchema);

export default OrderTracking;
