import mongoose from 'mongoose';
const { Schema } = mongoose;

const StaffActivityLogSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  staff: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  staffPosition: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['check-in', 'check-out', 'room-cleaned', 'order-processed', 'guest-complaint', 'maintenance', 'login', 'logout'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'pending', 'failed'],
    default: 'success'
  },
  relatedEntity: {
    type: String,
    // Could be roomId, orderId, bookingId, etc.
  },
  relatedEntityId: {
    type: Schema.Types.ObjectId
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

StaffActivityLogSchema.index({ hotel: 1, action: 1 });
StaffActivityLogSchema.index({ hotel: 1, staff: 1 });
StaffActivityLogSchema.index({ hotel: 1, timestamp: -1 });

export default mongoose.model('StaffActivityLog', StaffActivityLogSchema);
