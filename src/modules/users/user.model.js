const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Single source of truth - Must match auth.validator.js phoneSchema transform
const normalizePhone = (phone) => {
  if (!phone) return phone;
  let p = phone.replace(/[\s-]/g, '');
  if (p.startsWith('+91')) p = p.slice(3);
  if (p.startsWith('91') && p.length === 12) p = p.slice(2);
  return p;
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
      minlength: [2, 'Name must be atleast 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required - Phone is the Login ID'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return validator.isMobilePhone(v, 'en-IN') || /^[6-9]\d{9}$/.test(v) || /^\+91[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid Indian phone number',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password should have atleast 6 characters'],
      maxlength: [128, 'Password must be less than 128 characters'],
      select: false,
    },
    avatar: {
      public_id: { type: String, default: null },
      url: { type: String, default: null },
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      default: 'student',
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
    resetPasswordOtp: { type: String, select: false },
    resetPasswordOtpExpire: { type: Date, select: false },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ FIXED: Only 2 indexes - unique: true above already creates phone/email indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Normalize phone before save
userSchema.pre('save', function (next) {
  if (this.isModified('phone') && this.phone) {
    this.phone = normalizePhone(this.phone); // Always stored as 9876543210
  }
  next();
});

// Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate access token - 15m
userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION || '15m', algorithm: 'HS256' });
};

// Generate refresh token - 7d
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id, role: this.role, version: this.refreshTokenVersion }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    algorithm: 'HS256',
  });
};

// Compare password
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate reset password token
userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + (parseInt(process.env.PASSWORD_EXPIRE) || 10) * 60 * 1000;
  return resetToken;
};

// Check if account is locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5;
  const LOCK_MINUTES = parseInt(process.env.LOGIN_LOCK_MINUTES, 10) || 15;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts = (this.loginAttempts || 0) + 1;
    if (this.loginAttempts >= MAX_ATTEMPTS && !this.isLocked) {
      this.lockUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    }
  }
  await this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  await this.save();
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = crypto.randomInt(100000, 999999).toString();
  this.resetPasswordOtp = crypto.createHash('sha256').update(otp).digest('hex');
  this.resetPasswordOtpExpire = Date.now() + (parseInt(process.env.OTP_EXPIRE) || 10) * 60 * 1000;
  return otp;
};

userSchema.methods.verifyOTP = function (enteredOtp) {
  if (!this.resetPasswordOtp || !this.resetPasswordOtpExpire) return false;
  const hashed = crypto.createHash('sha256').update(enteredOtp).digest('hex');
  return this.resetPasswordOtp === hashed && this.resetPasswordOtpExpire > Date.now();
};

module.exports = mongoose.model('User', userSchema);
