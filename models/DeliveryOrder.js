import mongoose from 'mongoose';

const deliveryOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    
    deliveryService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery',
      required: true,
    },
    
    customer: {
      name: String,
      phone: String,
      email: String,
    },
    
    // Pickup details
    pickup: {
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
      location: {
        type: {
          type: String,
          default: 'Point'
        },
        coordinates: [Number] // [longitude, latitude]
      },
      contactName: String,
      contactPhone: String,
      instructions: String,
      pickupTime: Date,
    },
    
    // Delivery details
    delivery: {
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
      location: {
        type: {
          type: String,
          default: 'Point'
        },
        coordinates: [Number] // [longitude, latitude]
      },
      contactName: String,
      contactPhone: String,
      instructions: String,
      deliveryTime: Date,
    },
    
    // Item details
    items: [
      {
        name: String,
        quantity: Number,
        weight: Number,
        dimensions: {
          length: Number,
          width: Number,
          height: Number,
        },
      }
    ],
    
    // Pricing
    baseAmount: Number,
    distanceKm: {
      type: Number,
      default: 0,
    },
    distanceFee: {
      type: Number,
      default: 0,
    },
    deliveryFee: Number,
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: Number,
    
    // Courier assignment
    courier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Courier',
    },
    courierName: String,
    courierPhone: String,
    courierRating: Number,
    
    // Status tracking
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'picked-up',
        'in-transit',
        'arriving',
        'delivered',
        'failed',
        'cancelled'
      ],
      default: 'pending',
    },
    
    // Timestamps for each status
    acceptedAt: Date,
    pickedUpAt: Date,
    inTransitAt: Date,
    deliveredAt: Date,
    failedAt: Date,
    
    // Real-time tracking
    lastLocation: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: [Number],
      timestamp: Date,
    },
    
    locationHistory: [
      {
        location: {
          type: {
            type: String,
            default: 'Point'
          },
          coordinates: [Number],
        },
        timestamp: Date,
        status: String,
      }
    ],
    
    // Delivery evidence
    deliveryProof: {
      photo: String,
      signature: String,
      notes: String,
    },
    
    // Rating and feedback
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: String,
    
    // Delivery type
    deliveryType: {
      type: String,
      enum: ['same-day', 'scheduled', 'express', 'standard'],
      default: 'standard',
    },
    
    // Special handling
    requiresSignature: {
      type: Boolean,
      default: false,
    },
    isFragile: {
      type: Boolean,
      default: false,
    },
    isPerishable: {
      type: Boolean,
      default: false,
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create geospatial indexes for location-based queries
deliveryOrderSchema.index({ 'pickup.location': '2dsphere' });
deliveryOrderSchema.index({ 'delivery.location': '2dsphere' });
deliveryOrderSchema.index({ 'lastLocation': '2dsphere' });

export default mongoose.model('DeliveryOrder', deliveryOrderSchema);
