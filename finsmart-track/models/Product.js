import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide product description'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      enum: [
        'adult-wear',
        'children-wear',
        'shoes',
        'footwear',
        'accessories',
        'sportswear',
        'formal-wear',
        'casual-wear',
        'activewear',
        'outerwear',
        'undergarments',
        'swimwear',
        'seasonal',
        'jewelry',
        'supermarket',
        'furniture',
        'hair',
        'pets',
        'gym',
        'restaurants',
        'fast-food',
        'groceries',
        'hotels',
        'apartments',
        'rooms',
        'tours',
        'boat-cruise',
        'activities',
      ],
    },
    service: {
      type: String,
      enum: ['shopping', 'hotels', 'food', 'services', 'tours', 'furniture', 'hair', 'pets', 'gym'],
      required: true,
    },
    vendorType: {
      type: String,
      enum: [
        'restaurant',
        'hotel',
        'retail',
        'service',
        'tour-operator',
        'delivery',
        'clothing-store',
        'jewelry',
        'supermarket',
        'furniture',
        'hair-salon',
        'pet-store',
        'gym',
        'car-rental',
        'salon-spa',
        'event-center',
        'general',
        'hair',
        'pets',
        'gym-equipment'
      ],
      default: 'general',
    },
    image: {
      type: String,
      default: '',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    images: [String],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Variants
    size: [String],
    color: [String],
    features: [String],
    specifications: mongoose.Schema.Types.Mixed,
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
productSchema.index({ category: 1, service: 1 });
productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);
