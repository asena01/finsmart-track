import mongoose from 'mongoose';
const { Schema } = mongoose;

const SmartAccessGrantSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  device: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  subjectType: {
    type: String,
    enum: ['guest', 'staff'],
    required: true
  },
  subjectUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  subjectStaff: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  grantType: {
    type: String,
    enum: ['contactless-checkin', 'staff-shift', 'temporary'],
    default: 'temporary'
  },
  accessCode: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: null
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
  },
  issuedBy: {
    type: Schema.Types.ObjectId,
    refPath: 'issuedByModel',
    default: null
  },
  issuedByModel: {
    type: String,
    enum: ['User', 'Staff'],
    default: 'User'
  },
  revokedBy: {
    type: Schema.Types.ObjectId,
    refPath: 'revokedByModel',
    default: null
  },
  revokedByModel: {
    type: String,
    enum: ['User', 'Staff'],
    default: 'User'
  },
  revokedAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  scheduleId: {
    type: Schema.Types.ObjectId,
    ref: 'StaffSchedule',
    default: null
  },
  scheduleEntryId: {
    type: Schema.Types.ObjectId,
    default: null
  }
}, { timestamps: true });

SmartAccessGrantSchema.index({ hotel: 1, status: 1, subjectType: 1 });
SmartAccessGrantSchema.index({ booking: 1 });
SmartAccessGrantSchema.index({ room: 1, status: 1 });
SmartAccessGrantSchema.index({ scheduleId: 1, scheduleEntryId: 1, subjectStaff: 1 });

export default mongoose.model('SmartAccessGrant', SmartAccessGrantSchema);
