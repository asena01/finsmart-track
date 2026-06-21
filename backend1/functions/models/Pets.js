import mongoose from 'mongoose';

const petsSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  category: {
    type: String,
    enum: ['dog-food', 'cat-food', 'pet-toys', 'beds-houses', 'grooming', 'healthcare', 'accessories', 'pet-services'],
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    enum: ['product', 'service'],
    required: true
  },
  icon: String,
  
  // Pricing
  price: {
    type: Number,
    required: true
  },
  discountPrice: Number,
  currency: { type: String, default: 'USD' },
  
  // For Products
  stock: Number,
  sku: String,
  quantity: {
    value: Number,
    unit: String // e.g., 'kg', 'liter', 'pieces'
  },
  
  // Pet Specifications
  petSpecification: {
    petType: {
      type: String,
      enum: ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'other']
    },
    suitableFor: [String], // e.g., ['small dogs', 'puppies', 'senior cats']
    ageRange: {
      min: Number,
      max: Number,
      unit: String // 'months' or 'years'
    },
    ingredients: [String],
    nutritionalInfo: {
      protein: String,
      fat: String,
      fiber: String,
      moisture: String
    },
    allergienFree: [String], // e.g., ['grain-free', 'gluten-free']
    organic: { type: Boolean, default: false }
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
      startTime: String,
      endTime: String
    },
    serviceDetails: String, // e.g., 'Includes bath, grooming, nail trimming'
    maxPets: { type: Number, default: 5 },
    currentBookings: { type: Number, default: 0 }
  },
  
  // Images
  images: [String],
  thumbnail: String,
  
  // Features
  features: [String],
  
  // Brand & Manufacturer
  brand: String,
  manufacturer: String,
  
  // Ratings
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    reviews: [{
      userId: mongoose.Schema.Types.ObjectId,
      userName: String,
      petType: String,
      rating: Number,
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  
  // Shipping & Delivery
  shipping: {
    available: { type: Boolean, default: true },
    estimatedDays: Number,
    shippingCost: Number,
    freeShippingAbove: Number
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

petsSchema.index({ category: 1, price: 1 });
petsSchema.index({ vendorId: 1 });
petsSchema.index({ name: 'text', description: 'text' });
petsSchema.index({ 'petSpecification.petType': 1 });
petsSchema.index({ isFeatured: 1, createdAt: -1 });

const Pets = mongoose.model('Pets', petsSchema);
export default Pets;
