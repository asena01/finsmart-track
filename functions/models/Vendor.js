import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    businessName: {
      type: String,
      required: true
    },
    businessDescription: {
      type: String,
      default: ''
    },
    vendorType: {
      type: String,
      enum: ['furniture', 'hair', 'pets', 'gym-equipment'],
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    businessLicense: {
      type: String,
      default: null
    },
    businessLicenseImage: {
      type: String,
      default: null
    },
    profileImage: {
      type: String,
      default: null
    },
    bannerImage: {
      type: String,
      default: null
    },
    website: {
      type: String,
      default: ''
    },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      tiktok: { type: String, default: '' }
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      accountHolderName: String,
      bankCode: String
    },
    stats: {
      totalProducts: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      totalCustomers: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'suspended', 'active'],
      default: 'pending'
    },
    verificationStatus: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      business: { type: Boolean, default: false }
    },
    openingTime: {
      type: String,
      default: '09:00'
    },
    closingTime: {
      type: String,
      default: '18:00'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    operatingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }
  },
  { timestamps: true }
);

// Index for efficient queries
vendorSchema.index({ owner: 1 });
vendorSchema.index({ vendorType: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ businessName: 1 });
vendorSchema.index({ email: 1 });

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
