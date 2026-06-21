import mongoose from 'mongoose';
const { Schema } = mongoose;

const StaffScheduleEntrySchema = new Schema({
  staff: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  position: String,
  department: String,
  date: {
    type: Date,
    required: true
  },
  shiftType: {
    type: String,
    enum: ['morning', 'evening', 'night'],
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  assignedArea: String,
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'pending-acceptance', 'accepted', 'rejected', 'final'],
    default: 'pending-acceptance'
  },
  responseStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  responseNote: String,
  respondedAt: Date,
  swapRequest: {
    requestedByStaff: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
    },
    requestedByName: String,
    targetStaff: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
    },
    targetStaffName: String,
    targetEntryId: {
      type: Schema.Types.ObjectId
    },
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending'
    },
    requestedAt: Date
  },
  keyAccessAudit: {
    status: {
      type: String,
      enum: ['pending', 'generated', 'not-generated', 'revoked'],
      default: 'pending'
    },
    reason: String,
    generatedAt: Date,
    revokedAt: Date,
    grants: [{
      grantId: {
        type: Schema.Types.ObjectId,
        ref: 'SmartAccessGrant'
      },
      roomId: {
        type: Schema.Types.ObjectId,
        ref: 'Room'
      },
      roomNumber: String,
      deviceId: String,
      accessCode: String,
      status: String
    }]
  }
}, { _id: true });

const StaffScheduleSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  weekStart: {
    type: Date,
    required: true
  },
  weekEnd: {
    type: Date,
    required: true
  },
  generatedBy: {
    type: String
  },
  notes: String,
  entries: [StaffScheduleEntrySchema]
}, { timestamps: true });

StaffScheduleSchema.index({ hotel: 1, weekStart: 1 }, { unique: true });

export default mongoose.model('StaffSchedule', StaffScheduleSchema);
