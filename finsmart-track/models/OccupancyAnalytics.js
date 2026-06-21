import mongoose from 'mongoose';
const { Schema } = mongoose;

const OccupancyAnalyticsSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  occupancyRate: {
    type: Number,
    required: true
    // percentage: 0-100
  },
  occupiedRooms: {
    type: Number,
    required: true
  },
  totalRooms: {
    type: Number,
    required: true
  },
  revenue: {
    type: Number,
    default: 0
  },
  totalGuests: {
    type: Number,
    default: 0
  },
  averageStay: {
    type: Number,
    default: 0
    // in days
  },
  peakCheckInTime: String,
  roomTypeBreakdown: [{
    roomType: String,
    total: Number,
    occupied: Number,
    occupancyRate: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

OccupancyAnalyticsSchema.index({ hotel: 1, date: -1 });
OccupancyAnalyticsSchema.index({ hotel: 1 });

export default mongoose.model('OccupancyAnalytics', OccupancyAnalyticsSchema);
