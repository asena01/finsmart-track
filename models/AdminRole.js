import mongoose from 'mongoose';

const AdminRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['super-admin', 'admin', 'finance-manager', 'compliance-officer', 'support-manager', 'vendor-manager', 'custom'],
      description: 'Role name'
    },

    displayName: {
      type: String,
      required: true,
      description: 'Human-readable role name'
    },

    description: {
      type: String,
      description: 'Role description'
    },

    // Permissions
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminPermission'
      }
    ],

    // Module Access
    moduleAccess: {
      overview: {
        view: { type: Boolean, default: false },
        export: { type: Boolean, default: false }
      },
      vendors: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
        suspend: { type: Boolean, default: false },
        block: { type: Boolean, default: false }
      },
      kyc: {
        view: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
        reject: { type: Boolean, default: false },
        review: { type: Boolean, default: false }
      },
      settlements: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
        process: { type: Boolean, default: false }
      },
      payouts: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
        process: { type: Boolean, default: false },
        retry: { type: Boolean, default: false }
      },
      users: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        suspend: { type: Boolean, default: false }
      },
      organizations: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        verify: { type: Boolean, default: false }
      },
      payments: {
        view: { type: Boolean, default: false },
        refund: { type: Boolean, default: false },
        export: { type: Boolean, default: false }
      },
      devices: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      },
      settings: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false }
      },
      audit: {
        view: { type: Boolean, default: false },
        export: { type: Boolean, default: false }
      },
      reports: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        export: { type: Boolean, default: false }
      },
      roles: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      }
    },

    // Level/Hierarchy
    level: {
      type: Number,
      description: 'Role hierarchy level (0=super-admin, higher=less permissions)'
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },

    // Scope - who can this role manage
    canManageRoles: [
      {
        type: String,
        description: 'Role names this role can manage'
      }
    ],

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
AdminRoleSchema.index({ name: 1 });
AdminRoleSchema.index({ level: 1 });
AdminRoleSchema.index({ isActive: 1 });

export default mongoose.model('AdminRole', AdminRoleSchema);
