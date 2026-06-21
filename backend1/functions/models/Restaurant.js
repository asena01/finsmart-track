import mongoose from 'mongoose';
const { Schema } = mongoose;

const RestaurantSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  cuisine: {
    type: String,
    required: true
  },
  address: String,
  city: String,
  state: String,
  country: String,
  zipCode: String,
  phone: String,
  email: String,
  website: String,
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  deliveryTime: {
    type: Number,
    default: 30,
    description: 'Average delivery time in minutes'
  },
  deliveryFee: {
    type: Number,
    default: 2.99
  },
  minOrder: {
    type: Number,
    default: 10
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  operatingHours: {
    open: {
      type: String,
      default: '11:00 AM'
    },
    close: {
      type: String,
      default: '11:00 PM'
    }
  },
  icon: String,
  logo: String,
  images: [String],
  thumbnail: String,
  
  // Subscription and Billing
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'professional', 'enterprise'],
    default: 'basic'
  },
  billingDuration: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual'],
    default: 'monthly'
  },
  nextBillingDate: Date,

  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentReference: String,
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer'],
    default: 'credit_card'
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

export default mongoose.model('Restaurant', RestaurantSchema);
