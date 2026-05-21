import mongoose from 'mongoose';

const VendorKycSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    vendorType: {
      type: String,
      enum: ['hotel', 'restaurant', 'retail', 'service', 'tours'],
      required: true
    },
    
    // Personal Information
    personalInfo: {
      firstName: String,
      lastName: String,
      dateOfBirth: Date,
      nationality: String,
      idType: {
        type: String,
        enum: ['passport', 'national-id', 'drivers-license', 'other']
      },
      idNumber: String,
      idExpireDate: Date
    },

    // Address Information
    addressInfo: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      }
    },

    // Documents
    documents: [
      {
        type: {
          type: String,
          enum: ['id-proof', 'address-proof', 'business-license', 'tax-certificate', 'bank-statement', 'other']
        },
        fileName: String,
        fileUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        },
        verificationStatus: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending'
        },
        rejectionReason: String
      }
    ],

    // KYC Status
    status: {
      type: String,
      enum: ['pending', 'under-review', 'approved', 'rejected', 'resubmit-required'],
      default: 'pending'
    },

    // Review Information
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    rejectionReason: String,
    approvalNotes: String,

    // Risk Assessment
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },

    // AML Check
    amlCheck: {
      status: {
        type: String,
        enum: ['pending', 'passed', 'failed'],
        default: 'pending'
      },
      checkedAt: Date,
      checkedBy: mongoose.Schema.Types.ObjectId,
      findings: String
    },

    // Compliance
    sanctions: {
      checked: Boolean,
      result: String,
      checkedAt: Date
    },
    pep: {
      checked: Boolean,
      result: String,
      checkedAt: Date
    },

    // Submission History
    submissionHistory: [
      {
        submittedAt: Date,
        submittedData: mongoose.Schema.Types.Mixed,
        status: String,
        comments: String
      }
    ],

    // Additional Fields
    notes: String,
    expiryDate: Date,
    renewalDate: Date
  },
  {
    timestamps: true
  }
);

// Index for faster queries
VendorKycSchema.index({ vendor: 1 });
VendorKycSchema.index({ status: 1 });
VendorKycSchema.index({ vendorType: 1 });
VendorKycSchema.index({ riskLevel: 1 });

export default mongoose.model('VendorKyc', VendorKycSchema);
