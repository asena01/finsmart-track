import mongoose from 'mongoose';
const { Schema } = mongoose;

const TourGuideSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  expertise: {
    type: String,
    required: true
  },
  languages: {
    type: [String],
    default: ['English']
  },
  bio: String,
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  toursCompleted: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  profileImage: String,
  certifications: [String],
  yearsOfExperience: Number,
  
  // Contact and location
  address: String,
  city: String,
  state: String,
  country: String,
  
  // Employment details
  hireDate: Date,
  employmentStatus: {
    type: String,
    enum: ['full-time', 'part-time', 'contract'],
    default: 'contract'
  },
  
  // Performance metrics
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  nextAvailableDate: Date,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient querying
TourGuideSchema.index({ name: 1 });
TourGuideSchema.index({ email: 1 });
TourGuideSchema.index({ expertise: 1 });
TourGuideSchema.index({ status: 1 });
TourGuideSchema.index({ rating: -1 });

export default mongoose.model('TourGuide', TourGuideSchema);
