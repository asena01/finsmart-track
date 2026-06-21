import mongoose from 'mongoose';
const { Schema } = mongoose;

const BookingSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  bookingNumber: {
    type: String,
    unique: true
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  checkInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date,
    required: true
  },
  numberOfNights: Number,
  numberOfGuests: Number,
  roomRate: Number,
  numberOfRooms: {
    type: Number,
    default: 1
  },
  subtotal: Number,
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalPrice: Number,
  specialRequests: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'cash', 'bank_transfer', 'online', 'contactless', 'mobile_money', 'digital_wallet']
  },
  notes: String,
  reviewReminderSentAt: {
    type: Date,
    default: null
  },
  smartLockAccess: {
    accessToken: String,
    backupPin: String,
    qrCode: String,
    expiresAt: Date,
    usedAt: Date,
    unlockAttempts: [{
      timestamp: Date,
      success: Boolean,
      deviceId: String,
      error: String
    }],
    enabled: {
      type: Boolean,
      default: false
    },
    tuyaIdentity: {
      provider: String,
      subjectType: String,
      localId: String,
      externalKey: String,
      nickName: String,
      contact: String,
      displayName: String,
      bookingNumber: String,
      tuyaUserId: String,
      ttlockUserId: String,
      unlockSn: Number,
      unlockType: String,
      syncState: String,
      lastSyncedAt: Date
    }
  },
  identityVerification: {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'IdentityVerificationSession',
      default: null
    },
    bookingReference: String,
    provider: {
      type: String,
      default: 'mock'
    },
    status: {
      type: String,
      enum: ['not_required', 'pending', 'submitted', 'verified', 'manual_review', 'rejected'],
      default: 'not_required'
    },
    fallbackRequired: {
      type: Boolean,
      default: false
    },
    qrSessionToken: String,
    qrSessionExpiresAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    reviewedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    lastSubmittedAt: Date,
    failureReason: String,
    extractedIdentity: {
      fullName: String,
      dateOfBirth: String,
      documentNumber: String,
      nationality: String,
      issuingCountry: String,
      expirationDate: String,
      address: String,
      gender: String,
      issuingState: String,
      placeOfBirth: String
    },
    document: {
      idType: String,
      idNumber: String,
      idFrontImage: String,
      idBackImage: String,
      faceImage: String,
      issuingCountry: String,
      externalSessionId: String
    },
    checks: {
      ocr: {
        status: String,
        extractedName: String,
        extractedDob: String,
        confidence: Number
      },
      faceMatch: {
        status: String,
        score: Number,
        threshold: Number
      },
      liveness: {
        status: String,
        score: Number,
        threshold: Number,
        videoUrl: String
      },
      aml: {
        status: String,
        score: Number,
        threshold: Number,
        riskScore: Number
      },
      ip: {
        status: String,
        score: Number,
        threshold: Number,
        ipAddress: String,
        location: String,
        isProxy: Boolean
      }
    }
  },
  roomServiceOrders: [{
    _id: Schema.Types.ObjectId,
    items: [{
      itemId: {
        type: Schema.Types.ObjectId,
        ref: 'RoomServiceMenuItem'
      },
      name: String,
      price: Number,
      quantity: {
        type: Number,
        default: 1
      }
    }],
    totalPrice: Number,
    notes: String,
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'dispatched', 'delivering', 'delivered', 'cancelled'],
      default: 'pending'
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 30
    },
    orderedAt: {
      type: Date,
      default: Date.now
    },
    etaAt: Date,
    readyAt: Date,
    dispatchedAt: Date,
    deliveryStartTime: Date,
    deliveryEndTime: Date,
    deliveredAt: Date
  }],
  hotelServiceOrders: [{
    _id: Schema.Types.ObjectId,
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelAmenityService'
    },
    category: String,
    name: String,
    description: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1
    },
    totalPrice: Number,
    notes: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    fulfilledAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

BookingSchema.pre('save', function(next) {
  if (this.checkInDate && this.checkOutDate) {
    const nights = Math.ceil((this.checkOutDate - this.checkInDate) / (1000 * 60 * 60 * 24));
    this.numberOfNights = nights;
  }
  if (this.roomRate && this.numberOfNights) {
    this.subtotal = this.roomRate * this.numberOfNights * (this.numberOfRooms || 1);
  }
  if (this.subtotal) {
    this.totalPrice = this.subtotal + (this.tax || 0) - (this.discount || 0);
  }
  next();
});

BookingSchema.index({ hotel: 1, bookingNumber: 1 });
BookingSchema.index({ guest: 1 });
BookingSchema.index({ checkInDate: 1, checkOutDate: 1 });

export default mongoose.model('Booking', BookingSchema);
