import mongoose from 'mongoose';
const { Schema } = mongoose;

const FinanceSchema = new Schema({
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  vendorType: {
    type: String,
    enum: ['hotel', 'restaurant', 'retail', 'service', 'tours'],
    required: true
  },

  // Bank Information
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    bankCode: String,
    branchName: String,
    swiftCode: String,
    iban: String,
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'business'],
      default: 'business'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'rejected'],
      default: 'unverified'
    },
    verificationDate: Date,
    addedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Tax Information
  taxDetails: {
    taxId: String,
    taxName: String,
    businessRegistrationNumber: String,
    businessRegistrationType: {
      type: String,
      enum: ['sole_proprietor', 'partnership', 'corporation', 'llc', 'other'],
      default: 'corporation'
    },
    taxFilingStatus: {
      type: String,
      enum: ['filed', 'pending', 'not_filed'],
      default: 'pending'
    },
    taxFilingDate: Date,
    nextFilingDueDate: Date,
    taxRate: Number,
    taxExemptionStatus: Boolean,
    country: String,
    state: String,
    city: String,
    postalCode: String,
    businessAddress: String
  },

  // Business Identification
  businessInfo: {
    businessName: String,
    businessLegalName: String,
    businessId: String,
    licenseNumber: String,
    licenseExpiry: Date,
    businessCategory: String,
    businessSubCategory: String,
    yearsInBusiness: Number,
    numberOfEmployees: Number,
    businessRegistrationDate: Date,
    businessEntityType: {
      type: String,
      enum: ['for_profit', 'non_profit', 'government', 'educational'],
      default: 'for_profit'
    }
  },

  // Revenue Tracking
  revenue: {
    monthlyRevenue: {
      type: Map,
      of: Number,
      default: new Map()
    },
    yearlyRevenue: {
      type: Map,
      of: Number,
      default: new Map()
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageMonthlyRevenue: {
      type: Number,
      default: 0
    },
    lastRevenueUpdate: Date,
    revenueByCategory: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },

  // Payment Processing
  paymentProcessing: {
    paymentGateway: String,
    merchantId: String,
    commissionRate: Number,
    transactionFee: Number,
    minimumPayout: Number,
    payoutSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
      default: 'monthly'
    },
    lastPayoutDate: Date,
    nextPayoutDate: Date,
    totalPayoutAmount: Number,
    pendingPayoutAmount: Number
  },

  // Expenses and Deductions
  expenses: {
    annualOperatingCost: Number,
    monthlyOperatingCost: Number,
    employeeExpenses: Number,
    maintenanceExpenses: Number,
    marketingExpenses: Number,
    otherExpenses: Number,
    expenseHistory: [{
      month: String,
      year: Number,
      amount: Number,
      category: String,
      description: String
    }]
  },

  // Financial Documents
  documents: {
    bankStatements: [{
      fileName: String,
      fileUrl: String,
      uploadDate: Date,
      month: String,
      year: Number
    }],
    taxDocuments: [{
      fileName: String,
      fileUrl: String,
      uploadDate: Date,
      documentType: String,
      year: Number
    }],
    businessLicense: [{
      fileName: String,
      fileUrl: String,
      uploadDate: Date,
      expiryDate: Date
    }]
  },

  // Compliance and Verification
  compliance: {
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    kycVerificationDate: Date,
    amlCheckStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed'],
      default: 'pending'
    },
    amlCheckDate: Date,
    complianceNotes: String,
    lastComplianceCheck: Date
  },

  // Financial Summary
  summary: {
    totalTransactions: Number,
    totalRefunds: Number,
    activePaymentMethods: Number,
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'closed'],
      default: 'active'
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    supportingDocumentsCount: Number
  },

  // Contacts
  contacts: {
    primaryContact: {
      name: String,
      email: String,
      phone: String,
      title: String
    },
    accountingContact: {
      name: String,
      email: String,
      phone: String,
      title: String
    }
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
FinanceSchema.index({ vendor: 1 });
FinanceSchema.index({ vendorType: 1 });
FinanceSchema.index({ 'compliance.kycStatus': 1 });
FinanceSchema.index({ 'summary.accountStatus': 1 });

export default mongoose.model('Finance', FinanceSchema);
