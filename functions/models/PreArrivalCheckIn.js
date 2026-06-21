import mongoose from 'mongoose';
const { Schema } = mongoose;

const PreArrivalCheckInSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  },
  bookingId: {
    type: String,
    required: true
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  guestName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  idType: {
    type: String,
    enum: ['passport', 'driver-license', 'national-id', 'other'],
    required: true
  },
  idNumber: {
    type: String,
    required: true
  },
  checkInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date,
    required: true
  },
  roomType: String,
  numberOfGuests: Number,
  specialRequests: String,
  status: {
    type: String,
    enum: ['pending', 'verified', 'completed', 'cancelled'],
    default: 'pending'
  },
  verifiedAt: Date,
  completedAt: Date,
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Staff'
  }
}, { timestamps: true });

PreArrivalCheckInSchema.index({ hotel: 1, status: 1 });
PreArrivalCheckInSchema.index({ hotel: 1, booking: 1 });
PreArrivalCheckInSchema.index({ hotel: 1, checkInDate: 1 });

export default mongoose.model('PreArrivalCheckIn', PreArrivalCheckInSchema);
