import mongoose from 'mongoose';

const hairSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  category: {
    type: String,
    enum: ['human-hair', 'extensions', 'wigs', 'braiding-services', 'styling-services'],
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    enum: ['product', 'service'], // product = buy, service = book appointment
    required: true
  },
  icon: String,
  
  // Pricing
  price: {
    type: Number,
    required: true
  },
  currency: { type: String, default: 'USD' },
  
  // For Products
  stock: Number,
  sku: String,
  
  // Hair Specifications (for products)
  hairSpec: {
    type: {
      type: String,
      enum: ['straight', 'wavy', 'curly', 'coily', 'kinky']
    },
    length: {
      value: Number,
      unit: { type: String, default: 'inches' }
    },
    texture: String, // e.g., 'silky', 'natural'
    source: String, // e.g., '100% Virgin Human Hair'
    weight: {
      value: Number,
      unit: { type: String, default: 'oz' }
    },
    coverage: String, // e.g., 'full head', 'partial'
    color: [String],
    dyed: { type: Boolean, default: false }
  },
  
  // For Services
  service: {
    duration: {
      value: Number,
      unit: { type: String, default: 'hours' }
    },
    availability: {
      monday: Boolean,
      tuesday: Boolean,
      wednesday: Boolean,
      thursday: Boolean,
      friday: Boolean,
      saturday: Boolean,
      sunday: Boolean,
      startTime: String, // e.g., '09:00'
      endTime: String    // e.g., '17:00'
    },
    maxClients: { type: Number, default: 10 },
    currentBookings: { type: Number, default: 0 }
  },
  
  // Images
  images: [String],
  thumbnail: String,
  
  // Features & Benefits
  features: [String], // e.g., ['100% human hair', 'tangle-free', 'easy to style']
  benefits: [String],
  
  // Ratings
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    reviews: [{
      userId: mongoose.Schema.Types.ObjectId,
      userName: String,
      rating: Number,
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  
  // Provider
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  vendorName: String,
  vendorLocation: {
    address: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  tags: [String]
});

hairSchema.index({ category: 1, price: 1 });
hairSchema.index({ vendorId: 1 });
hairSchema.index({ name: 'text', description: 'text' });
hairSchema.index({ isFeatured: 1, createdAt: -1 });

const Hair = mongoose.model('Hair', hairSchema);
export default Hair;
