import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'bogo', 'free-shipping'],
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      required: true
    },
    applicableProducts: [String], // Product IDs
    minPurchaseAmount: {
      type: Number,
      default: 0
    },
    maxUsagePerCustomer: {
      type: Number,
      default: null
    },
    totalUsageLimit: {
      type: Number,
      default: null
    },
    currentUsage: {
      type: Number,
      default: 0
    },
    code: {
      type: String,
      unique: true,
      sparse: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    categories: [String],
    usedBy: [
      {
        customerId: String,
        usedAt: Date
      }
    ]
  },
  { timestamps: true }
);

promotionSchema.index({ vendorId: 1 });
promotionSchema.index({ code: 1 });
promotionSchema.index({ active: 1 });

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;
