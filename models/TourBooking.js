import mongoose from 'mongoose';
const { Schema } = mongoose;

const TourBookingSchema = new Schema({
  bookingNumber: {
    type: String,
    unique: true,
    required: true
  },
  tour: {
    type: Schema.Types.ObjectId,
    ref: 'Tour',
    required: true
  },
  tourOperator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tourName: String,
  destination: String,
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  
  // Booking details
  numberOfParticipants: {
    type: Number,
    required: true,
    min: 1
  },
  startDate: Date,
  endDate: Date,
  
  // Pricing
  pricePerPerson: {
    type: Number,
    required: true
  },
  numberOfDays: Number,
  subtotal: Number,
  tax: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true
  },
  
  // Payment information
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentReference: String,
  
  // Card details (encrypted in production)
  cardDetails: {
    cardholderName: String,
    cardLastFour: String,
    cardBrand: String,
    expiryMonth: String,
    expiryYear: String
  },
  
  // Billing address
  billingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Booking status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  
  specialRequirements: String,
  notes: String,
  
  // Timestamps
  bookedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,
  cancelledAt: Date,
  
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
TourBookingSchema.index({ customer: 1, status: 1 });
TourBookingSchema.index({ tour: 1 });
TourBookingSchema.index({ tourOperator: 1 }); // For operator dashboard filtering
TourBookingSchema.index({ paymentStatus: 1 });
TourBookingSchema.index({ bookedAt: -1 });

export default mongoose.model('TourBooking', TourBookingSchema);
