import mongoose from 'mongoose';

const { Schema } = mongoose;

const HotelAmenityServiceSchema = new Schema(
  {
    hotel: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true
    },
    category: {
      type: String,
      enum: ['service', 'laundry', 'massage', 'spa', 'gym', 'shuttle'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    serviceDetails: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    pricingType: {
      type: String,
      enum: ['per-request', 'per-hour', 'per-session', 'per-day'],
      default: 'per-request'
    },
    duration: {
      type: String,
      default: 'On request'
    },
    availability: {
      type: String,
      default: 'Available daily'
    },
    icon: {
      type: String,
      default: '✨'
    },
    image: String,
    requiresScheduling: {
      type: Boolean,
      default: false
    },
    available: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

HotelAmenityServiceSchema.index({ hotel: 1, category: 1, isActive: 1 });

export default mongoose.model('HotelAmenityService', HotelAmenityServiceSchema);
