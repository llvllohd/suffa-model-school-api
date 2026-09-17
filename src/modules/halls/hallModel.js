const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');

const hallSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Hall name is required'],
      trim: true,
      minlength: [3, 'Hall name must be at least 3 characters'],
      maxlength: [100, 'Hall name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    location: {
      address: {
        type: String,
        required: [true, 'Full address is required (e.g., Shamshuddin Circle, Bhatkal)'],
        trim: true,
        minlength: [5, 'Address must be at least 5 characters'],
        maxlength: [300, 'Address cannot exceed 300 characters'],
      },
      city: {
        type: String,
        default: 'Bhatkal',
        enum: {
          values: ['Bhatkal', 'Murdeshwar', 'Honavar', 'Kumta'],
          message: 'City must be Bhatkal, Murdeshwar, Honavar or Kumta',
        },
      },
      googleMapLink: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || validator.isURL(v),
          message: 'Google Map link must be a valid URL',
        },
      },
      pincode: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || /^[0-9]{6}$/.test(v),
          message: 'Pincode must be 6 digits',
        },
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Guest capacity is required'],
      min: [50, 'Capacity must be at least 50 guests'],
      max: [10000, 'Capacity cannot be more than 10000 guests'],
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Per hour price is required for short functions'],
      min: [500, 'Per hour price must be at least ₹500'],
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Per day price is required for wedding booking'],
      min: [1000, 'Per day price must be at least ₹1000'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Hall owner phone number is required'],
      trim: true,
      set: (v) =>
        v
          ? v
              .replace(/[\s\-+]/g, '')
              .replace(/^91/, '')
              .slice(-10)
          : v,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return validator.isMobilePhone(v, 'en-IN') || /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid phone number',
      },
    },
    contactPersonName: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    amenities: {
      type: [
        {
          type: String,
          enum: ['AC', 'Parking', 'Kitchen', 'Dining Hall', 'Bride Room', 'Sound System', 'Decoration', 'Generator', 'CCTV', 'Lift'],
        },
      ],
      default: [],
    },
    images: {
      type: [String],
      required: [true, 'At least one hall image is required'],
      validate: [
        {
          validator: (v) => v.length > 0,
          message: 'At least 1 image required',
        },
        {
          validator: (v) => v.length <= 10,
          message: 'Maximum 10 images allowed',
        },
        {
          validator: (v) => v.every((url) => validator.isURL(url)),
          message: 'All images must be valid URLs',
        },
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    blockedDates: {
      type: [Date],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

hallSchema.index({ name: 1, 'location.city': 1 }, { unique: true });
hallSchema.index({ pricePerDay: 1 });
hallSchema.index({ owner: 1 });
hallSchema.index({ 'location.city': 1, isActive: 1 });

hallSchema.pre('save', function (next) {
  // price check
  if (this.pricePerDay && this.pricePerHour && this.pricePerDay <= this.pricePerHour) {
    return next(new Error('Per day price must be greater than per hour price'));
  }
  // blockedDates check (only when modified)
  if (this.isModified('blockedDates')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasPast = this.blockedDates.some((d) => new Date(d).setHours(0, 0, 0, 0) < today);
    if (hasPast) return next(new Error('Blocked date cannot be in past'));
  }
  // create slug
  if (this.isModified('name') || this.isModified('location.city') || !this.slug) {
    const base = `${this.name} ${this.location.city}`;
    this.slug = slugify(base, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Hall', hallSchema);
