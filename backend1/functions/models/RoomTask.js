import mongoose from 'mongoose';

const { Schema } = mongoose;

const RoomTaskSchema = new Schema(
  {
    hotel: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: false
    },
    roomNumber: {
      type: String,
      required: true
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking'
    },
    taskType: {
      type: String,
      enum: ['checkout-cleaning', 'stayover-cleaning', 'deep-cleaning', 'maintenance', 'inspection', 'minibar-restock', 'room-service-delivery', 'hotel-service-request'],
      required: true
    },
    sourceType: {
      type: String,
      enum: ['manual', 'booking-checkout', 'food-order', 'hotel-service-order', 'maintenance-report'],
      default: 'manual'
    },
    sourceId: String,
    sourceLabel: String,
    title: {
      type: String,
      required: true
    },
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in-progress', 'completed', 'cancelled'],
      default: 'open'
    },
    source: {
      type: String,
      enum: ['checkout', 'manual', 'maintenance-report', 'inspection-followup', 'food-order', 'hotel-service-order'],
      default: 'manual'
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    dueAt: Date,
    assignedStaff: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
    },
    assignedStaffName: String,
    assignedBy: {
      type: Schema.Types.ObjectId
    },
    assignedByName: String,
    startedAt: Date,
    completionNotes: String,
    actualDurationMinutes: Number,
    completedAt: Date
  },
  { timestamps: true }
);

RoomTaskSchema.index({ hotel: 1, status: 1, taskType: 1, scheduledDate: -1 });
RoomTaskSchema.index({ room: 1, taskType: 1, status: 1 });
RoomTaskSchema.index({ booking: 1, taskType: 1 });

export default mongoose.model('RoomTask', RoomTaskSchema);
