import mongoose from 'mongoose';

const ServiceBookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    serviceName: String,
    serviceCategory: String,
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    providerName: String,
    
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerName: {
      type: String,
      required: true
    },
    customerEmail: {
      type: String,
      required: true
    },
    customerPhone: {
      type: String,
      required: true
    },
    
    // Booking Details
    bookingDate: {
      type: Date,
      required: true
    },
    startTime: String,
    endTime: String,
    duration: Number,
    durationUnit: {
      type: String,
      enum: ['hour', 'day', 'visit', 'project'],
      default: 'hour'
    },
    
    // Service Location
    serviceLocation: {
      address: String,
      city: String,
      area: String,
      zipCode: String,
      notes: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    
    // Pricing
    pricing: {
      basePrice: Number,
      unitPrice: Number,
      quantity: Number,
      subtotal: Number,
      tax: {
        type: Number,
        default: 0
      },
      discount: {
        type: Number,
        default: 0
      },
      totalPrice: Number
    },
    
    // Payment
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
      default: 'credit_card'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    cardDetails: {
      cardholderName: String,
      last4Digits: String,
      brand: String,
      expiryMonth: String,
      expiryYear: String
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    
    // Booking Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    
    // Additional Info
    specialRequirements: String,
    notes: String,
    
    // Verification
    proofOfService: {
      photoBefore: String,
      photoAfter: String,
      completionTime: Date,
      notes: String
    },
    
    // Rating
    customerRating: {
      rating: Number,
      review: String,
      ratedAt: Date
    },
    providerRating: {
      rating: Number,
      review: String,
      ratedAt: Date
    },
    
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes
ServiceBookingSchema.index({ bookingNumber: 1 });
ServiceBookingSchema.index({ customer: 1 });
ServiceBookingSchema.index({ service: 1 });
ServiceBookingSchema.index({ serviceProvider: 1 });
ServiceBookingSchema.index({ status: 1 });
ServiceBookingSchema.index({ bookingDate: 1 });

export default mongoose.model('ServiceBooking', ServiceBookingSchema);
