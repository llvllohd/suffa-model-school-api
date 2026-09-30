const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  refreshToken,
  forgotPasswordOtp,
  verifyOtp,
  resetPasswordWithOtp,
} = require('./auth.controller');
const { updatePassword } = require('../users/user.controller');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordParamsSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  verifyOtpSchema,
  resetPasswordWithOtpSchema,
} = require('./auth.validator');
const { validate } = require('../../middlewares/validate.middleware');
const { isAuthenticatedUser } = require('../../middlewares/auth.middleware');
const { authLimiter, forgotPasswordLimiter, refreshLimiter } = require('../../middlewares/rateLimiter.middleware');
const asyncHandlerMiddleware = require('../../middlewares/asyncHandler.middleware');

router.post('/register', authLimiter, validate(registerSchema), asyncHandlerMiddleware(registerUser));
router.post('/login', authLimiter, validate(loginSchema), asyncHandlerMiddleware(loginUser));
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), asyncHandlerMiddleware(forgotPassword));
router.put('/password/update', isAuthenticatedUser, validate(updatePasswordSchema), asyncHandlerMiddleware(updatePassword));
router.post('/forgot-password/otp', forgotPasswordLimiter, validate(forgotPasswordSchema), asyncHandlerMiddleware(forgotPasswordOtp));
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), asyncHandlerMiddleware(verifyOtp));
router.post('/password/reset/otp', authLimiter, validate(resetPasswordWithOtpSchema), asyncHandlerMiddleware(resetPasswordWithOtp));
router.post(
  '/password/reset/:token',
  validate(resetPasswordParamsSchema, 'params'),
  validate(resetPasswordSchema, 'body'),
  asyncHandlerMiddleware(resetPassword),
);

router.post('/refresh-token', refreshLimiter, asyncHandlerMiddleware(refreshToken));
router.post('/logout', isAuthenticatedUser, asyncHandlerMiddleware(logoutUser));

module.exports = router;
