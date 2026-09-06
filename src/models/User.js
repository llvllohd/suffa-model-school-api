const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
      minlength: [2, 'Name should have atleast 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return validator.isMobilePhone(v, 'en-IN') || /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid phone number',
      },
    },
    password: {
      type: String,
      required: function () {
        return this.sourceType === 'normal';
      },
      minlength: [8, 'Password should have atleast 8 characters'],
      maxlength: [128, 'Password must be less than 128 characters'],
      select: false,
    },
    avatar: {
      public_id: {
        type: String,
        default: null,
      },
      url: {
        type: String,
        default: null,
      },
    },
    role: {
      type: String,
      enum: ['user', 'hall_owner', 'admin'],
      default: 'user',
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['normal', 'google', 'phone'],
      default: 'normal',
      index: true,
    },
    googleId: { type: String, sparse: true, unique: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
    resetPasswordOtp: { type: String, select: false },
    resetPasswordOtpExpire: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, isActive: 1 }); // For admin listing hall_owners
userSchema.index({ createdAt: -1 });

// Hash Password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate Token
userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION || '7d' });
};

// Compare Password
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateResetPasswordToken = function () {
  //Generate Token Using Crypto
  const resetToken = crypto.randomBytes(32).toString('hex');
  // Hash & Add Reset Password Token to UserShema
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + (parseInt(process.env.PASSWORD_EXPIRE) || 10) * 60 * 1000; // 10 minutes
  return resetToken;
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = crypto.randomInt(100000, 999999).toString();
  this.resetPasswordOtp = crypto.createHash('sha256').update(otp).digest('hex');
  this.resetPasswordOtpExpire = Date.now() + (parseInt(process.env.OTP_EXPIRE) || 10) * 60 * 1000; // 10 minutes
  return otp;
};

userSchema.methods.verifyOTP = function (enteredOtp) {
  if (!this.resetPasswordOtp || !this.resetPasswordOtpExpire) return false;
  const hashed = crypto.createHash('sha256').update(enteredOtp).digest('hex');
  return this.resetPasswordOtp === hashed && this.resetPasswordOtpExpire > Date.now();
};

module.exports = mongoose.model('User', userSchema);
