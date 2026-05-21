import mongoose from 'mongoose';
const { Schema } = mongoose;

const MaintenanceSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room'
  },
  roomNumber: String,
  issue: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['electrical', 'plumbing', 'heating', 'cooling', 'furniture', 'appliances', 'cleaning', 'painting', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedDate: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'Staff'
  },
  startDate: Date,
  completionDate: Date,
  estimatedCost: Number,
  actualCost: Number,
  notes: String,
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

MaintenanceSchema.index({ hotel: 1, status: 1, priority: 1 });
MaintenanceSchema.index({ room: 1 });

export default mongoose.model('Maintenance', MaintenanceSchema);
