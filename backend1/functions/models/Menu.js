import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number, // Actual sale price
    default: null,
    min: 0
  },
  originalPrice: {
    type: Number, // For display purposes (marked price)
    default: null,
    min: 0
  },
  category: {
    type: String,
    required: true
  },
  vendorId: {
    type: String, // Restaurant ID for tracking who created this item
    required: true,
    index: true
  },
  image: String,
  imageUrl: String,
  imageStoragePath: String, // Path in Firebase Storage
  isAvailable: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15
  },
  prepTime: {
    type: Number, // Alias for preparationTime
    default: 15
  },
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'very-hot'],
    default: 'mild'
  },
  allergens: [String], // e.g., ['peanuts', 'dairy', 'gluten']
  vegetarian: Boolean,
  vegan: Boolean,
  isSpecial: {
    type: Boolean,
    default: false
  },
  tags: [String], // e.g., ['popular', 'new', 'bestseller']
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const menuSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
      index: true
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      default: 'Regular Menu'
    },
    description: String,
    items: [menuItemSchema],
    isActive: {
      type: Boolean,
      default: true
    },
    categories: [String], // Categories available in this menu
    preparationTimeEstimate: {
      min: { type: Number, default: 10 },
      max: { type: Number, default: 45 }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes
menuSchema.index({ restaurantId: 1 });
menuSchema.index({ 'items.category': 1 });
menuSchema.index({ 'items.isAvailable': 1 });
menuSchema.index({ createdAt: -1 });

const Menu = mongoose.model('Menu', menuSchema);

export default Menu;
