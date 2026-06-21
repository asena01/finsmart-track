import mongoose from 'mongoose';
const { Schema } = mongoose;

const verificationCheckSchema = new Schema({
  status: {
    type: String,
    enum: ['pending', 'passed', 'manual_review', 'failed'],
    default: 'pending'
  },
  score: Number,
  threshold: Number,
  extractedName: String,
  extractedDob: String,
  confidence: Number,
  reason: String,
  videoUrl: String,
  ipAddress: String,
  location: String,
  isProxy: Boolean,
  riskScore: Number
}, { _id: false });

const qrSessionSchema = new Schema({
  token: String,
  url: String,
  expiresAt: Date,
  completedAt: Date,
  lastAccessedAt: Date,
  source: {
    type: String,
    enum: ['desktop', 'mobile', 'unknown'],
    default: 'unknown'
  }
}, { _id: false });

const reviewSchema = new Schema({
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  reviewedAt: Date,
  decision: {
    type: String,
    enum: ['approved', 'rejected', 'manual_review'],
    default: 'manual_review'
  },
  note: String
}, { _id: false });

const IdentityVerificationSessionSchema = new Schema({
  hotel: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  bookingReference: {
    type: String,
    required: true,
    index: true
  },
  provider: {
    type: String,
    default: 'mock'
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'staff'],
    default: 'web'
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'manual_review', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  fallbackRequired: {
    type: Boolean,
    default: false
  },
  externalSessionId: {
    type: String,
    index: true
  },
  externalSessionUrl: String,
  identityPayload: {
    type: Schema.Types.Mixed,
    default: null
  },
  document: {
    idType: {
      type: String,
      enum: ['passport', 'national_id', 'drivers_license', 'id_card', 'other'],
      default: 'passport'
    },
    idNumber: String,
    idFrontImage: String,
    idBackImage: String,
    faceImage: String,
    passportImageName: String,
    passportImage: String,
    selfieVideoName: String,
    selfieVideo: String,
    selfieWithIdImageName: String,
    selfieWithIdImage: String
  },
  qrSession: qrSessionSchema,
  checks: {
    ocr: {
      type: verificationCheckSchema,
      default: () => ({ status: 'pending' })
    },
    faceMatch: {
      type: verificationCheckSchema,
      default: () => ({ status: 'pending' })
    },
    liveness: {
      type: verificationCheckSchema,
      default: () => ({ status: 'pending' })
    },
    aml: {
      type: verificationCheckSchema,
      default: () => ({ status: 'pending' })
    },
    ip: {
      type: verificationCheckSchema,
      default: () => ({ status: 'pending' })
    }
  },
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
  submittedAt: Date,
  completedAt: Date,
  failureReason: String,
  review: {
    type: reviewSchema,
    default: () => ({})
  }
}, { timestamps: true });

IdentityVerificationSessionSchema.index({ hotel: 1, booking: 1, createdAt: -1 });
IdentityVerificationSessionSchema.index({ 'qrSession.token': 1 }, { sparse: true });

export default mongoose.model('IdentityVerificationSession', IdentityVerificationSessionSchema);
