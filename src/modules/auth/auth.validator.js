const Joi = require('joi');

exports.registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'any.required': 'Name is required',
    'string.empty': 'Name is required',
    'string.min': 'Name must be atleast 2 characters',
    'string.max': 'Name cannot exceed 50 characters',
  }),
  email: Joi.string().trim().lowercase().email().max(254).required().messages({
    'any.required': 'Email is required',
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email',
  }),
  phone: Joi.string()
    .trim()
    .allow('', null)
    .optional()
    .custom((value, helpers) => {
      if (!value) return undefined;
      const cleaned = value
        .replace(/[\s\-+]/g, '')
        .replace(/^91/, '')
        .slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleaned)) return helpers.error('any.invalid');
      return cleaned;
    })
    .messages({ 'any.invalid': 'Please enter a valid phone number' }),
  password: Joi.string().min(8).max(128).required().messages({
    'any.required': 'Please enter your password',
    'string.empty': 'Please enter your password',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be less than 128 characters',
  }),

  // --- MUST FORBID ---
  role: Joi.forbidden(),
  sourceType: Joi.forbidden(),
  googleId: Joi.forbidden(),
  avatar: Joi.forbidden(),
  isVerified: Joi.forbidden(),
  isActive: Joi.forbidden(),
  lastLogin: Joi.forbidden(),
  loginAttempts: Joi.forbidden(),
  lockUntil: Joi.forbidden(),
  resetPasswordToken: Joi.forbidden(),
  resetPasswordExpire: Joi.forbidden(),
  resetPasswordOtp: Joi.forbidden(),
  resetPasswordOtpExpire: Joi.forbidden(),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
}).unknown(false);

exports.loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'any.required': 'Invalid email or password',
    'string.empty': 'Invalid email or password',
    'string.email': 'Invalid email or password',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Invalid email or password',
    'string.empty': 'Invalid email or password',
  }),
}).unknown(false);

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'any.required': 'Invalid email',
    'string.empty': 'Invalid email',
    'string.email': 'Invalid email',
  }),
}).unknown(false);

exports.resetPasswordParamsSchema = Joi.object({
  token: Joi.string().trim().hex().length(64).required().messages({
    'any.required': 'Invalid token',
    'string.empty': 'Invalid token',
    'string.hex': 'Invalid token',
    'string.length': 'Invalid token',
  }),
}).unknown(false);

exports.resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(128).required().messages({
    'any.required': 'Invalid password',
    'string.empty': 'Invalid password',
    'string.min': 'Password should have at least 8 characters',
    'string.max': 'Password must be less than 128 characters',
  }),
  confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.required': 'Passwords do not match',
    'string.empty': 'Passwords do not match',
    'any.only': 'Passwords do not match',
  }),
}).unknown(false);

exports.verifyOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'any.required': 'Invalid email',
    'string.empty': 'Invalid email',
    'string.email': 'Invalid email',
  }),
  otp: Joi.string().trim().length(6).pattern(/^\d{6}$/).required().messages({
    'any.required': 'OTP is required',
    'string.empty': 'OTP is required',
    'string.length': 'Invalid OTP',
    'string.pattern.base': 'Invalid OTP',
  }),
}).unknown(false);

exports.resetPasswordWithOtpSchema = Joi.object({
  otpSessionToken: Joi.string().trim().required().messages({
    'any.required': 'Session token is required',
    'string.empty': 'Session token is required',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'any.required': 'Password is required',
    'string.empty': 'Password is required',
    'string.min': 'Password should have at least 8 characters',
    'string.max': 'Password must be less than 128 characters',
  }),
  confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.required': 'Passwords do not match',
    'string.empty': 'Passwords do not match',
    'any.only': 'Passwords do not match',
  }),
}).unknown(false);

exports.updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({ 'any.required': 'Old password is required', 'string.empty': 'Old password is required' }),
  newPassword: Joi.string().min(8).max(128).required().invalid(Joi.ref('oldPassword')).messages({
    'any.required': 'New password is required',
    'string.empty': 'New password is required',
    'string.min': 'Password should have at least 8 characters',
    'string.max': 'Password must be less than 128 characters',
    'any.invalid': 'New password cannot be same as old password',
  }),
  confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
    'any.required': 'Confirm password is required',
    'string.empty': 'Confirm password is required',
    'any.only': 'Passwords do not match',
  }),
}).unknown(false);
