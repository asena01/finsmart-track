import mongoose from 'mongoose';

const AdminPermissionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      description: 'Unique permission code (e.g., vendor.view, vendor.create)'
    },

    name: {
      type: String,
      required: true,
      description: 'Human-readable permission name'
    },

    description: {
      type: String,
      description: 'Detailed description of what this permission allows'
    },

    // Resource & Action
    resource: {
      type: String,
      enum: [
        'vendor',
        'kyc',
        'settlement',
        'payout',
        'user',
        'organization',
        'payment',
        'device',
        'settings',
        'audit-log',
        'report',
        'role',
        'notification',
        'analytics'
      ],
      required: true
    },

    action: {
      type: String,
      enum: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'suspend', 'block', 'export', 'download', 'process', 'retry', 'verify'],
      required: true
    },

    // Scope
    scope: {
      type: String,
      enum: ['own', 'team', 'organization', 'all'],
      default: 'all',
      description: 'Scope of data this permission applies to'
    },

    // Conditions (Optional)
    conditions: {
      vendorType: [String],
      status: [String],
      region: [String],
      minAmount: Number,
      maxAmount: Number,
      customConditions: mongoose.Schema.Types.Mixed
    },

    // Category
    category: {
      type: String,
      enum: ['vendor-management', 'financial', 'compliance', 'support', 'system'],
      description: 'Permission category for grouping'
    },

    // Risk Level
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      description: 'Security risk level of this permission'
    },

    // Requires Approval
    requiresApproval: {
      type: Boolean,
      default: false,
      description: 'Whether this action requires additional approval'
    },

    // Audit Required
    auditRequired: {
      type: Boolean,
      default: true,
      description: 'Whether actions with this permission should be audited'
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },

    // Deprecated
    deprecated: {
      type: Boolean,
      default: false
    },

    deprecationDate: Date,
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminPermission'
    },

    // Related Permissions
    dependsOn: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminPermission'
      }
    ],

    // Rate Limiting
    rateLimiting: {
      enabled: { type: Boolean, default: false },
      maxAttempts: Number,
      timeWindowMinutes: Number
    },

    // Notification Settings
    notifyOnUse: {
      type: Boolean,
      default: false
    },

    // Notes
    notes: String,

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
AdminPermissionSchema.index({ code: 1 });
AdminPermissionSchema.index({ resource: 1, action: 1 });
AdminPermissionSchema.index({ category: 1 });
AdminPermissionSchema.index({ riskLevel: 1 });

export default mongoose.model('AdminPermission', AdminPermissionSchema);
