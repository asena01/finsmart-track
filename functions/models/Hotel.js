import mongoose from 'mongoose';
const { Schema } = mongoose;

const HotelSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  basePrice: {
    type: Number,
    default: 0,
    description: 'Minimum price of available rooms (used for search/sorting)'
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
  totalRooms: Number,
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  reviewsCount: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    default: 'Hotel'
  },
  starRating: {
    type: Number,
    min: 1,
    max: 5
  },
  distanceToCenterKm: {
    type: Number,
    default: 0
  },
  amenities: [String],
  thumbnail: String,
  photos: [String],
  freeCancellation: {
    type: Boolean,
    default: false
  },
  breakfastIncluded: {
    type: Boolean,
    default: false
  },
  checkInTime: {
    type: String,
    default: '14:00'
  },
  checkOutTime: {
    type: String,
    default: '11:00'
  },
  policies: {
    checkIn: String,
    checkOut: String,
    cancellation: String
  },

  // Smart Lock & Contactless Check-In
  contactlessCheckInEnabled: {
    type: Boolean,
    default: false
  },

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
  transactionHistory: [
    {
      amount: Number,
      transactionId: String,
      status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'pending'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  isActive: {
    type: Boolean,
    default: true
  },
  logo: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Hotel', HotelSchema);
