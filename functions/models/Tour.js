import mongoose from 'mongoose';
const { Schema } = mongoose;

const TourSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  destination: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Moderate', 'Hard'],
    default: 'Easy'
  },
  groupSize: {
    type: String,
    required: true
  },
  highlights: [String],
  includes: [String],
  image: String,
  images: [String],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  maxParticipants: {
    type: Number,
    default: 20
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  startDate: Date,
  endDate: Date,
  location: {
    city: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  tourOperator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  operatorName: String,
  operatorPhone: String,
  operatorEmail: String,
  itinerary: [
    {
      day: Number,
      title: String,
      description: String,
      activities: [String]
    }
  ],
  amenities: [String],
  languages: [String],
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer'],
    default: 'credit_card'
  },
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

// Index for efficient searching
TourSchema.index({ destination: 1, difficulty: 1 });
TourSchema.index({ name: 'text', description: 'text', destination: 'text' });

export default mongoose.model('Tour', TourSchema);
