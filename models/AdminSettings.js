import mongoose from 'mongoose';

const adminSettingsSchema = new mongoose.Schema(
  {
    // Platform configuration
    platformName: {
      type: String,
      default: 'MarketHub',
    },
    platformLogo: String,
    platformBanner: String,
    platformDescription: String,
    
    // Commission settings
    commissions: {
      hotel: {
        type: Number,
        default: 5, // percentage
      },
      restaurant: {
        type: Number,
        default: 5,
      },
      retail: {
        type: Number,
        default: 5,
      },
      service: {
        type: Number,
        default: 5,
      },
      'tour-operator': {
        type: Number,
        default: 5,
      },
    },
    
    // Payment gateway settings
    paymentGateways: {
      stripe: {
        enabled: {
          type: Boolean,
          default: false,
        },
        apiKey: String,
        secretKey: String,
      },
      paypal: {
        enabled: {
          type: Boolean,
          default: false,
        },
        clientId: String,
        clientSecret: String,
      },
    },
    
    // Email settings
    emailSettings: {
      smtpHost: String,
      smtpPort: Number,
      smtpUser: String,
      smtpPassword: String,
      fromEmail: String,
      fromName: String,
    },
    
    // Notification settings
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
    },
    
    // System settings
    systemSettings: {
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      maintenanceMessage: String,
      allowUserRegistration: {
        type: Boolean,
        default: true,
      },
      allowVendorRegistration: {
        type: Boolean,
        default: true,
      },
      requireEmailVerification: {
        type: Boolean,
        default: true,
      },
      requirePhoneVerification: {
        type: Boolean,
        default: false,
      },
    },
    
    // Security settings
    security: {
      jwtSecret: String,
      sessionTimeout: {
        type: Number,
        default: 3600, // seconds
      },
      maxLoginAttempts: {
        type: Number,
        default: 5,
      },
      lockoutDuration: {
        type: Number,
        default: 1800, // seconds
      },
    },
    
    // Analytics settings
    analytics: {
      trackingEnabled: {
        type: Boolean,
        default: true,
      },
      googleAnalyticsId: String,
    },
    
    // Feature flags
    features: {
      enableHotelDashboard: {
        type: Boolean,
        default: true,
      },
      enableRestaurantDashboard: {
        type: Boolean,
        default: true,
      },
      enableRetailDashboard: {
        type: Boolean,
        default: true,
      },
      enableServiceDashboard: {
        type: Boolean,
        default: true,
      },
      enableToursDashboard: {
        type: Boolean,
        default: true,
      },
    },
    
    // Contact and legal
    contact: {
      email: String,
      phone: String,
      address: String,
    },
    legal: {
      privacyPolicyUrl: String,
      termsOfServiceUrl: String,
      cookiePolicyUrl: String,
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('AdminSettings', adminSettingsSchema);
