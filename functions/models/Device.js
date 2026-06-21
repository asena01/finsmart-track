import mongoose from 'mongoose';
const { Schema } = mongoose;

const DeviceSchema = new Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel'
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room'
  },
  roomNumber: Number,
  deviceType: {
    type: String,
    enum: ['motion_sensor', 'door_sensor', 'smart_lock', 'thermostat', 'camera', 'light', 'speaker'],
    default: 'motion_sensor'
  },
  status: {
    type: Boolean,
    default: false
  },
  lastDetection: String,
  lastDetectionTime: Date,
  location: String,
  description: String,
  batteryLevel: Number,
  signalStrength: Number,
  tuyaDeviceId: String,
  tuyaProductId: String,
  ttlockDeviceId: String,
  ttlockProductId: String,
  metadata: Schema.Types.Mixed,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

DeviceSchema.index({ hotel: 1, deviceType: 1 });
DeviceSchema.index({ room: 1 });
DeviceSchema.index({ deviceId: 1 });

export default mongoose.model('Device', DeviceSchema);
