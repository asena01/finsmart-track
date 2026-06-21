import mongoose from 'mongoose';

const restaurantSettingsSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    logo: String,
    logoStoragePath: String, // Path in Firebase Storage
    bannerImage: String,
    bannerStoragePath: String,
    cuisineType: [String], // e.g., ['Italian', 'Chinese', 'Indian']
    address: String,
    city: String,
    state: String,
    zipCode: String,
    phone: String,
    email: String,
    website: String,
    operatingHours: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean }
    },
    deliverySettings: {
      minOrderValue: Number,
      deliveryFee: Number,
      deliveryTime: {
        min: Number, // in minutes
        max: Number
      },
      acceptsDelivery: { type: Boolean, default: true }
    },
    takeawaySettings: {
      acceptsTakeaway: { type: Boolean, default: true },
      preparationTime: {
        min: Number, // in minutes
        max: Number
      }
    },
    diningSettings: {
      acceptsDining: { type: Boolean, default: true },
      tables: Number
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    monthlyRevenue: {
      type: Number,
      default: 0
    },
    paymentMethods: [
      {
        type: String,
        enum: ['cash', 'card', 'upi', 'wallet'],
        default: 'cash'
      }
    ],
    currency: {
      type: String,
      default: 'NGN'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    featuredImage: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      bankCode: String
    }
  },
  { timestamps: true }
);

// Indexes
restaurantSettingsSchema.index({ restaurantId: 1 });
restaurantSettingsSchema.index({ verificationStatus: 1 });
restaurantSettingsSchema.index({ isActive: 1 });
restaurantSettingsSchema.index({ createdAt: -1 });

const RestaurantSettings = mongoose.model('RestaurantSettings', restaurantSettingsSchema);

export default RestaurantSettings;
