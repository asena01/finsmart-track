import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: ['health-beauty', 'car-rentals', 'event-centers', 'plumbing', 'electrical', 'cleaning', 'moving', 'maintenance']
    },
    icon: {
      type: String,
      default: '🔧'
    },
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    providerName: String,
    providerPhone: String,
    providerEmail: String,
    providerImage: String,
    
    // Pricing
    basePrice: {
      type: Number,
      required: true
    },
    pricePerUnit: Number,
    priceUnit: {
      type: String,
      enum: ['hour', 'day', 'visit', 'project'],
      default: 'hour'
    },
    minimumBooking: {
      type: Number,
      default: 1
    },
    
    // Service Details
    duration: {
      type: String,
      default: '1-2 hours'
    },
    availability: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    serviceArea: {
      type: String,
      default: 'City-wide'
    },
    
    // Location
    location: {
      city: String,
      area: String,
      zipCode: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    
    // Rating and Reviews
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5
    },
    reviews: {
      type: Number,
      default: 0
    },
    
    // Features/Amenities
    features: [String],
    equipment: [String],
    certifications: [String],
    
    // Policies
    cancellationPolicy: String,
    refundPolicy: String,
    insuranceIncluded: {
      type: Boolean,
      default: false
    },
    
    // Booking
    maxConcurrentBookings: {
      type: Number,
      default: 5
    },
    currentBookings: {
      type: Number,
      default: 0
    },
    
    // Status
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Media
    image: String,
    images: [String],
    
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
ServiceSchema.index({ category: 1 });
ServiceSchema.index({ 'location.city': 1 });
ServiceSchema.index({ rating: -1 });
ServiceSchema.index({ serviceProvider: 1 });

export default mongoose.model('Service', ServiceSchema);
