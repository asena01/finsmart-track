import mongoose from 'mongoose';
const { Schema } = mongoose;

const RoomServiceMenuItemSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['appetizer', 'main', 'dessert', 'beverage', 'sides', 'breakfast', 'lunch', 'dinner'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountedPrice: {
    type: Number,
    default: null
  },
  image: String,
  availability: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'all-day'],
    default: 'all-day'
  },
  roomServiceEligible: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    default: 30
  },
  dietary: {
    type: [String],
    enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nuts-free', 'spicy']
  },
  available: {
    type: Boolean,
    default: true
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

RoomServiceMenuItemSchema.index({ hotel: 1, category: 1 });

export default mongoose.model('RoomServiceMenuItem', RoomServiceMenuItemSchema);
