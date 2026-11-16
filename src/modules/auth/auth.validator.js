const { z } = require('zod');

// --- Helper - V4 - Same pattern as category nameField ---
const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

// --- Common ---
const emailSchema = reqString('Email is required', 'Email must be a string')
  .trim()
  .toLowerCase()
  .max(254, 'Email must be less than 254 characters')
  .email('Please enter a valid email');

const passwordSchema = reqString('Password is required', 'Password must be a string')
  .min(6, 'Password should have atleast 6 characters')
  .max(128, 'Password must be less than 128 characters');

// Phone - Required, always stored as 10-digit
const phoneSchema = reqString('Phone is required', 'Phone must be a string')
  .trim()
  .transform((val) => {
    const cleaned = val
      .replace(/[\s\-+]/g, '')
      .replace(/^91(?=\d{10}$)/, '')
      .slice(-10);
    return cleaned;
  })
  .refine((val) => /^[6-9]\d{9}$/.test(val), 'Please enter a valid phone number');

// --- LOGIN - Phone is the Login ID ---
const loginSchema = z
  .object({
    phone: phoneSchema,
    password: reqString('Invalid phone or password', 'Invalid phone or password').min(1, 'Invalid phone or password'),
  })
  .strict();

// --- FORGOT PASSWORD - Reset Link ---
const forgotPasswordSchema = z.object({ email: emailSchema }).strict();

// --- FORGOT PASSWORD - OTP ---
const forgotPasswordOtpSchema = z.object({ email: emailSchema }).strict();

// --- RESET PASSWORD - Params : /reset/:token ---
const resetPasswordParamsSchema = z
  .object({
    token: reqString('Invalid token', 'Invalid token')
      .trim()
      .length(64, 'Invalid token')
      .regex(/^[a-f0-9]+$/, 'Invalid token'),
  })
  .strict();

// --- RESET PASSWORD - Body ---
const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: reqString('Passwords do not match', 'Confirm password must be a string'),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// --- VERIFY OTP ---
const verifyOtpSchema = z
  .object({
    email: emailSchema,
    otp: reqString('OTP is required', 'OTP must be a string')
      .trim()
      .length(6, 'Invalid OTP')
      .regex(/^\d{6}$/, 'Invalid OTP'),
  })
  .strict();

// --- RESET PASSWORD WITH OTP ---
const resetPasswordWithOtpSchema = z
  .object({
    otpSessionToken: reqString('Session token is required', 'Session token must be a string').trim().min(1, 'Session token is required'),
    password: passwordSchema,
    confirmPassword: reqString('Passwords do not match', 'Confirm password must be a string'),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// --- UPDATE PASSWORD - Logged In User ---
const updatePasswordSchema = z
  .object({
    oldPassword: reqString('Old password is required', 'Old password must be a string').min(1, 'Old password is required'),
    newPassword: passwordSchema,
    confirmPassword: reqString('Confirm password is required', 'Confirm password must be a string'),
  })
  .strict()
  .refine((data) => data.newPassword !== data.oldPassword, {
    message: 'New password cannot be same as old password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  forgotPasswordOtpSchema,
  resetPasswordParamsSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resetPasswordWithOtpSchema,
  updatePasswordSchema,
};
