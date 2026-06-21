import mongoose from 'mongoose';
const { Schema } = mongoose;

const RestaurantMenuSchema = new Schema({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
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
  image: String,
  category: {
    type: String,
    required: true,
    enum: ['Pizza', 'Burgers', 'Salads', 'Sides', 'Drinks', 'Appetizers', 'Rolls', 'Nigiri', 'Tacos', 'Burritos', 'Curries', 'Rice Dishes', 'Breads', 'Bowls', 'Smoothies']
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  prepTime: {
    type: Number,
    default: 15,
    description: 'Preparation time in minutes'
  },
  isAvailable: {
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

// Index for efficient querying
RestaurantMenuSchema.index({ restaurantId: 1, category: 1 });
RestaurantMenuSchema.index({ restaurantId: 1 });

export default mongoose.model('RestaurantMenu', RestaurantMenuSchema);
