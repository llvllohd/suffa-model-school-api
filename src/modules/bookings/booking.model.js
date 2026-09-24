const mongoose = require('mongoose');
const validator = require('validator');

const bookingSchema = new mongoose.Schema(
  {
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: [true, 'Hall reference is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      validate: {
        validator: function (v) {
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          const d = new Date(v);
          d.setUTCHours(0, 0, 0, 0);
          return d >= today;
        },
        message: 'Start date cannot be in the past',
      },
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (v) {
          if (!v) return true;
          if (this.startDate) return new Date(v) >= new Date(this.startDate);
          return true;
        },
        message: 'End date cannot be before start date',
      },
    },
    type: {
      type: String,
      required: [true, 'Booking type is required (booked / blocked)'],
      enum: {
        values: ['booked', 'blocked'],
        message: 'Type must be either booked or blocked',
      },
    },
    customerName: {
      type: String,
      trim: true,
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [50, 'Customer name cannot exceed 50 characters'],
      validate: {
        validator: function (v) {
          if (this.type === 'booked') return !!v && v.trim().length >= 2;
          return true;
        },
        message: 'Customer name is required when marking as booked',
      },
    },
    customerPhone: {
      type: String,
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
          if (this.type !== 'booked') return true;
          if (!v) return false;
          return validator.isMobilePhone(v, 'en-IN') || /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid phone number',
      },
    },
    totalAmount: {
      type: Number,
      min: [0, 'Total amount cannot be negative'],
      max: [1000000, 'Total amount cannot exceed ₹10,00,000'],
      validate: {
        validator: function (v) {
          if (this.type === 'booked') return v != null && v > 0; // must be >0
          return true;
        },
        message: 'Total amount is required and must be > 0',
      },
    },
    paidAmount: {
      type: Number,
      min: [0, 'Paid amount cannot be negative'],
      max: [1000000, 'Paid amount cannot exceed ₹10,00,000'],
      default: 0,
      validate: {
        validator: function (v) {
          if (this.type !== 'booked') return true;
          if (this.totalAmount != null && v != null) {
            return v <= this.totalAmount;
          }
          return true;
        },
        message: 'Paid amount cannot exceed total amount',
      },
    },
    remainingAmount: {
      type: Number,
      min: [0, 'Remaining cannot be negative'],
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'partial', 'paid'],
        message: 'Payment status must be pending, partial or paid',
      },
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy user is required'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
  },
  { timestamps: true },
);

bookingSchema.index({ hall: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ hall: 1, type: 1 });
bookingSchema.index({ owner: 1, startDate: -1 });
bookingSchema.index({ hall: 1, owner: 1 });
bookingSchema.index({ startDate: 1 });
bookingSchema.index({ createdBy: 1 });
bookingSchema.index({ paymentStatus: 1 });

bookingSchema.pre('save', function (next) {
  if (this.startDate) {
    const s = new Date(this.startDate);
    s.setUTCHours(0, 0, 0, 0);
    this.startDate = s;
  }
  if (this.endDate) {
    const e = new Date(this.endDate);
    e.setUTCHours(0, 0, 0, 0);
    this.endDate = e;
  } else {
    this.endDate = this.startDate;
  }

  if (this.type === 'blocked') {
    this.customerName = undefined;
    this.customerPhone = undefined;
    this.totalAmount = undefined;
    this.paidAmount = undefined;
    this.remainingAmount = undefined;
    this.paymentStatus = undefined;
  } else {
    const total = this.totalAmount || 0;
    const paid = this.paidAmount || 0;
    this.remainingAmount = Math.max(0, total - paid);

    if (paid === 0) this.paymentStatus = 'pending';
    else if (paid >= total) this.paymentStatus = 'paid';
    else this.paymentStatus = 'partial';
  }
  next();
});

bookingSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const set = update.$set || update;

  if (set.startDate) {
    const s = new Date(set.startDate);
    s.setUTCHours(0, 0, 0, 0);
    set.startDate = s;
    if (update.$set) update.$set.startDate = s;
    else update.startDate = s;
  }
  if (set.endDate) {
    const e = new Date(set.endDate);
    e.setUTCHours(0, 0, 0, 0);
    set.endDate = e;
    if (update.$set) update.$set.endDate = e;
    else update.endDate = e;
  }
  if (set.startDate && !set.endDate) {
    set.endDate = set.startDate;
    if (update.$set) update.$set.endDate = set.startDate;
    else update.endDate = set.startDate;
  }

  if (set.type === 'blocked') {
    if (update.$set) {
      delete update.$set.customerName;
      delete update.$set.customerPhone;
      delete update.$set.totalAmount;
      delete update.$set.paidAmount;
      delete update.$set.remainingAmount;
      delete update.$set.paymentStatus;
    }
    update.$unset = {
      ...(update.$unset || {}),
      customerName: 1,
      customerPhone: 1,
      totalAmount: 1,
      paidAmount: 1,
      remainingAmount: 1,
      paymentStatus: 1,
    };
  }
  this.setUpdate(update);
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
