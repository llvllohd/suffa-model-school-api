const { z } = require('zod');

// --- Common ---
const emailSchema = z.string({ required_error: 'Email is required' }).trim().toLowerCase().max(254).email('Please enter a valid email');

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(6, 'Password should have atleast 6 characters')
  .max(128, 'Password must be less than 128 characters');

// Phone - Required, always stored as 10-digit
const phoneSchema = z
  .string({ required_error: 'Phone is required' })
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
    password: z.string({ required_error: 'Invalid phone or password' }).min(1, 'Invalid phone or password'),
  })
  .strict();

// --- FORGOT PASSWORD - Reset Link ---
const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// --- FORGOT PASSWORD - OTP ---
const forgotPasswordOtpSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// --- RESET PASSWORD - Params : /reset/:token ---
const resetPasswordParamsSchema = z
  .object({
    token: z
      .string({ required_error: 'Invalid token' })
      .trim()
      .length(64, 'Invalid token')
      .regex(/^[a-f0-9]+$/, 'Invalid token'),
  })
  .strict();

// --- RESET PASSWORD - Body ---
const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Passwords do not match' }),
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
    otp: z
      .string({ required_error: 'OTP is required' })
      .trim()
      .length(6, 'Invalid OTP')
      .regex(/^\d{6}$/, 'Invalid OTP'),
  })
  .strict();

// --- RESET PASSWORD WITH OTP ---
const resetPasswordWithOtpSchema = z
  .object({
    otpSessionToken: z.string({ required_error: 'Session token is required' }).trim().min(1, 'Session token is required'),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Passwords do not match' }),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// --- UPDATE PASSWORD - Logged In User ---
const updatePasswordSchema = z
  .object({
    oldPassword: z.string({ required_error: 'Old password is required' }).min(1, 'Old password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
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
