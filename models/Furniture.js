import mongoose from 'mongoose';

const furnitureSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  category: {
    type: String,
    enum: ['living-room', 'bedroom', 'kitchen', 'office', 'outdoor', 'decor'],
    required: true,
    index: true
  },
  icon: String,
  
  // Pricing
  price: {
    type: Number,
    required: true
  },
  discountPrice: Number,
  currency: { type: String, default: 'USD' },
  
  // Inventory
  stock: {
    type: Number,
    default: 0
  },
  sku: {
    type: String,
    unique: true
  },
  
  // Dimensions & Specifications
  dimensions: {
    width: Number,
    height: Number,
    depth: Number,
    unit: { type: String, default: 'cm' }
  },
  weight: {
    value: Number,
    unit: { type: String, default: 'kg' }
  },
  material: [String], // e.g., ['wood', 'fabric', 'metal']
  color: [String],
  finish: String, // e.g., 'matte', 'glossy'
  
  // Features
  features: [String],
  warranty: {
    duration: Number, // months
    type: String // e.g., 'manufacturer'
  },
  
  // Images & Media
  images: [String],
  thumbnail: String,
  
  // Shipping & Delivery
  shipping: {
    available: { type: Boolean, default: true },
    estimatedDays: Number,
    shippingCost: Number,
    freeShippingAbove: Number
  },
  
  // Assembly
  assembly: {
    required: { type: Boolean, default: false },
    assemblyTime: String, // e.g., '2-3 hours'
    instructions: String
  },
  
  // Ratings & Reviews
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
  
  // Status
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  tags: [String]
});

// Indexes for efficient querying
furnitureSchema.index({ category: 1, price: 1 });
furnitureSchema.index({ vendorId: 1 });
furnitureSchema.index({ name: 'text', description: 'text' });
furnitureSchema.index({ isFeatured: 1, createdAt: -1 });

const Furniture = mongoose.model('Furniture', furnitureSchema);

export default Furniture;
