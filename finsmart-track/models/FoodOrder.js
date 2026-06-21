import mongoose from 'mongoose';
const { Schema } = mongoose;

const FoodOrderSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  guestName: {
    type: String,
    required: true
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [String],
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'dispatched', 'delivered', 'cancelled', 'confirmed', 'preparing', 'ready', 'en-route', 'delivering'],
    default: 'pending'
  },
  readyAt: Date,
  dispatchedAt: Date,
  deliveredAt: Date,
  category: {
    type: String,
    enum: ['food', 'drink', 'mixed'],
    default: 'mixed'
  },
  assignedStaff: {
    type: Schema.Types.ObjectId,
    ref: 'Staff'
  },
  orderTime: {
    type: Date,
    default: Date.now
  },
  prepStartTime: Date,
  prepEndTime: Date,
  deliveryStartTime: Date,
  deliveryEndTime: Date,
  notes: String,
  specialInstructions: String,
  preparationTime: {
    type: Number,
    default: 20 // Default 20 minutes
  },
  estimatedDeliveryTime: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

FoodOrderSchema.index({ hotel: 1, status: 1 });
FoodOrderSchema.index({ roomNumber: 1 });
FoodOrderSchema.index({ guest: 1 });

export default mongoose.model('FoodOrder', FoodOrderSchema);
