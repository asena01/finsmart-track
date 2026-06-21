import mongoose from 'mongoose';
const { Schema } = mongoose;

const RestaurantOrderSchema = new Schema({
  orderId: {
    type: String,
    unique: true,
    required: true,
    default: () => `ORDER-${Date.now()}`
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [
    {
      menuItemId: {
        type: Schema.Types.ObjectId,
        ref: 'RestaurantMenu'
      },
      name: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      specialInstructions: String
    }
  ],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    required: true,
    default: 2.99
  },
  tax: {
    type: Number,
    required: true,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'on_the_way', 'delivered', 'cancelled'],
    default: 'pending'
  },
  readyAt: Date,
  dispatchedAt: Date,
  deliveredAt: Date,
  estimatedDelivery: {
    type: Number,
    description: 'Estimated delivery time in minutes'
  },
  
  // Customer Information
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  
  // Driver Information
  driverName: String,
  driverPhone: String,
  driverRating: {
    type: Number,
    min: 0,
    max: 5
  },
  currentLocation: String,
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ['credit-card', 'debit-card', 'bank-transfer', 'mobile-money', 'wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Integrated Delivery (third-party delivery provider)
  integratedDeliveryId: {
    type: Schema.Types.ObjectId,
    ref: 'IntegratedDelivery',
    default: null
  },

  deliveryStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'picking_up', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // Delivery Integration Reference
  deliveryIntegrationId: {
    type: Schema.Types.ObjectId,
    ref: 'BusinessDeliveryIntegration',
    default: null
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  prepStartTime: Date,
  deliveryStartTime: Date,
  completedAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for efficient querying
RestaurantOrderSchema.index({ restaurantId: 1 });
RestaurantOrderSchema.index({ customerId: 1 });
RestaurantOrderSchema.index({ status: 1 });
RestaurantOrderSchema.index({ createdAt: -1 });
RestaurantOrderSchema.index({ orderId: 1 });

export default mongoose.model('RestaurantOrder', RestaurantOrderSchema);
