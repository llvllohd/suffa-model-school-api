const express = require('express');
const router = express.Router();

const {
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  refreshToken,
  forgotPasswordOtp,
  verifyOtp,
  resetPasswordWithOtp,
} = require('@/modules/auth/auth.controller');
const { updatePassword } = require('@/modules/users/user.controller');
const {
  loginSchema,
  forgotPasswordSchema,
  forgotPasswordOtpSchema,
  resetPasswordParamsSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  verifyOtpSchema,
  resetPasswordWithOtpSchema,
} = require('@/modules/auth/auth.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser } = require('@/middlewares/auth.middleware');
const { authLimiter, forgotPasswordLimiter, resetPasswordLimiter, refreshLimiter } = require('@/middlewares/rateLimiter.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

router.post('/login', authLimiter, validate(loginSchema), asyncHandlerMiddleware(loginUser));
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), asyncHandlerMiddleware(forgotPassword));
router.put('/password/update', isAuthenticatedUser, validate(updatePasswordSchema), asyncHandlerMiddleware(updatePassword));
router.post('/forgot-password/otp', forgotPasswordLimiter, validate(forgotPasswordOtpSchema), asyncHandlerMiddleware(forgotPasswordOtp));
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), asyncHandlerMiddleware(verifyOtp));
router.post('/password/reset/otp', resetPasswordLimiter, validate(resetPasswordWithOtpSchema), asyncHandlerMiddleware(resetPasswordWithOtp));
router.post(
  '/password/reset/:token',
  resetPasswordLimiter,
  validate(resetPasswordParamsSchema, 'params'),
  validate(resetPasswordSchema, 'body'),
  asyncHandlerMiddleware(resetPassword),
);

router.post('/refresh-token', refreshLimiter, asyncHandlerMiddleware(refreshToken));
router.post('/logout', isAuthenticatedUser, asyncHandlerMiddleware(logoutUser));

module.exports = router;
