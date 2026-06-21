import mongoose from 'mongoose';

const GymSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Please provide class/program name'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Please provide class/program description']
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      enum: [
        'cardio',
        'strength-training',
        'yoga',
        'pilates',
        'zumba',
        'boxing',
        'crossfit',
        'personal-training'
      ],
      index: true
    },

    // Pricing
    price: {
      type: Number,
      required: [true, 'Please provide price per session'],
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    discountPrice: Number,

    // Class/Program Details
    duration: {
      type: Number,
      required: true, // in minutes
      min: 1
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      required: true
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Please provide class capacity'],
      min: 1
    },
    currentEnrollment: {
      type: Number,
      default: 0,
      min: 0
    },

    // Instructor Information
    instructor: String,
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    instructorBio: String,
    instructorCertification: String,
    instructorImage: String,

    // Target Audience
    targetAudience: {
      type: [String],
      enum: ['Men', 'Women', 'Mixed', 'Kids', 'Seniors'],
      default: ['Mixed']
    },

    // Equipment Required
    equipment: [String], // e.g., 'dumbbells', 'yoga mat', 'treadmill'
    venueInfo: {
      roomName: String,
      location: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },

    // Schedule
    schedule: {
      dayOfWeek: [String], // e.g., ['Monday', 'Wednesday', 'Friday']
      startTime: String, // e.g., '10:00 AM'
      endTime: String,
      timezone: String,
      recurring: {
        type: Boolean,
        default: true
      },
      specificDates: [Date] // for one-off sessions
    },

    // Media
    images: [String],
    thumbnail: String,
    videoUrl: String,

    // Gym/Center Provider
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gymName: String,
    gymPhone: String,
    gymEmail: String,

    // Pricing Plan Options
    pricingPlans: [
      {
        name: {
          type: String,
          enum: ['Pay Per Session', 'Monthly Pass', 'Quarterly Pass', 'Annual Pass']
        },
        price: Number,
        sessionsIncluded: Number,
        validityDays: Number,
        description: String
      }
    ],

    // Features & Amenities
    features: [String], // e.g., ['water bottle provided', 'towel service', 'shower facility']
    prerequisites: [String], // e.g., 'swimming ability', 'basic fitness level'

    // Ratings & Reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      },
      reviews: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          userName: String,
          userImage: String,
          rating: Number,
          comment: String,
          verified: Boolean,
          createdAt: { type: Date, default: Date.now }
        }
      ]
    },

    // Cancellation & Refund Policy
    cancellationPolicy: {
      cancellationDeadline: Number, // hours before class
      refundPercentage: Number
    },

    // Status & Availability
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    availableSlots: {
      type: Number,
      required: true,
      min: 0
    },
    waitlistEnabled: {
      type: Boolean,
      default: false
    },
    waitlist: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        addedDate: { type: Date, default: Date.now }
      }
    ],

    // Metadata
    tags: [String],
    sku: String,

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
GymSchema.index({ category: 1, difficulty: 1 });
GymSchema.index({ gymId: 1 });
GymSchema.index({ 'schedule.dayOfWeek': 1 });
GymSchema.index({ name: 'text', description: 'text' });
GymSchema.index({ isFeatured: 1, createdAt: -1 });
GymSchema.index({ 'targetAudience': 1 });
GymSchema.index({ isActive: 1, 'schedule.dayOfWeek': 1 });

export default mongoose.model('Gym', GymSchema);
