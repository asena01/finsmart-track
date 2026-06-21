import mongoose from 'mongoose';
const { Schema } = mongoose;

const TransactionSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  type: {
    type: String,
    enum: ['room', 'food', 'drink', 'service'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
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
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'mobile-money'],
    default: 'card'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

TransactionSchema.index({ hotel: 1, status: 1 });
TransactionSchema.index({ hotel: 1, type: 1 });
TransactionSchema.index({ hotel: 1, timestamp: -1 });

export default mongoose.model('Transaction', TransactionSchema);
