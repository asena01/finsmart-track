import mongoose from 'mongoose';

const gymEquipmentSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  category: {
    type: String,
    enum: ['dumbbells', 'cardio', 'barbells', 'resistance', 'benches', 'racks', 'machines', 'accessories'],
    required: true,
    index: true
  },
  subcategory: String,
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
  
  // Equipment Specifications
  specifications: {
    type: {
      type: String,
      enum: ['free-weight', 'machine', 'cardio', 'accessory']
    },
    material: [String], // e.g., ['steel', 'rubber', 'plastic']
    weight: {
      value: Number,
      unit: { type: String, default: 'kg' }
    },
    dimensions: {
      width: Number,
      height: Number,
      depth: Number,
      unit: { type: String, default: 'cm' }
    },
    capacity: {
      value: Number,
      unit: String // e.g., 'kg', 'lbs'
    },
    resistance: {
      type: String,
      enum: ['adjustable', 'fixed']
    },
    resistanceLevels: Number,
    color: [String],
    warranty: {
      duration: Number, // months
      coverage: String // e.g., 'parts and labor'
    }
  },
  
  // Features & Benefits
  features: [String], // e.g., ['adjustable height', 'easy assembly', 'portable']
  targetMuscles: [String], // e.g., ['biceps', 'chest', 'legs']
  fitnessLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all-levels']
  },
  
  // Images & Media
  images: [String],
  thumbnail: String,
  
  // Shipping & Delivery
  shipping: {
    available: { type: Boolean, default: true },
    estimatedDays: Number,
    shippingCost: Number,
    freeShippingAbove: Number,
    requiresSignature: { type: Boolean, default: false },
    requiresAssembly: { type: Boolean, default: false }
  },
  
  // Assembly & Maintenance
  assembly: {
    required: { type: Boolean, default: false },
    estimatedTime: String, // e.g., '2-3 hours'
    tools: [String],
    instructions: String
  },
  maintenance: {
    required: { type: Boolean, default: false },
    frequency: String, // e.g., 'monthly'
    tips: [String]
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
      verified: Boolean,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  
  // Certifications & Compliance
  certifications: [String], // e.g., ['CE', 'ISO 9001']
  complianceNotes: String,
  
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

// Indexes
gymEquipmentSchema.index({ category: 1, price: 1 });
gymEquipmentSchema.index({ vendorId: 1 });
gymEquipmentSchema.index({ name: 'text', description: 'text' });
gymEquipmentSchema.index({ isFeatured: 1, createdAt: -1 });
gymEquipmentSchema.index({ 'specifications.targetMuscles': 1 });

const GymEquipment = mongoose.model('GymEquipment', gymEquipmentSchema);
export default GymEquipment;
