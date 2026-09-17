const express = require('express');
const router = express.Router();

const { registerUser, loginUser, logoutUser, forgotPassword, resetPassword, refreshToken } = require('./authController');
const { updatePassword } = require('../users/userController');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordParamsSchema, resetPasswordSchema, updatePasswordSchema } = require('./authValidator');
const { validate } = require('../../middlewares/validateMiddleware');
const { isAuthenticatedUser } = require('../../middlewares/authMiddleware');
const { authLimiter, forgotPasswordLimiter, refreshLimiter } = require('../../middlewares/rateLimiterMiddleware');
const asyncHandlerMiddleware = require('../../middlewares/asyncHandlerMiddleware');

router.post('/register', authLimiter, validate(registerSchema), asyncHandlerMiddleware(registerUser));
router.post('/login', authLimiter, validate(loginSchema), asyncHandlerMiddleware(loginUser));
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), asyncHandlerMiddleware(forgotPassword));
router.put('/password/update', isAuthenticatedUser, validate(updatePasswordSchema), asyncHandlerMiddleware(updatePassword));
router.post(
  '/password/reset/:token',
  validate(resetPasswordParamsSchema, 'params'),
  validate(resetPasswordSchema, 'body'),
  asyncHandlerMiddleware(resetPassword),
);
router.get('/refresh-token', refreshLimiter, asyncHandlerMiddleware(refreshToken));
router.get('/logout', isAuthenticatedUser, asyncHandlerMiddleware(logoutUser));

module.exports = router;
