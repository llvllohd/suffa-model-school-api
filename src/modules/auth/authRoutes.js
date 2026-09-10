const express = require('express');
const router = express.Router();

const { registerUser, loginUser, logoutUser, forgotPassword, resetPassword, refreshToken } = require('./authController');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordParamsSchema, resetPasswordSchema, updatePasswordSchema } = require('./authValidator');
const { validate } = require('../../middlewares/validate');
const decryptPasswordMiddleware = require('../../middlewares/decryptPasswordMiddleware');
const { isAuthenticatedUser } = require('../../middlewares/auth');
const { authLimiter, forgotPasswordLimiter, refreshLimiter } = require('../../middlewares/rateLimiter');
const { updatePassword } = require('../users/userController');

router.post('/register', authLimiter, decryptPasswordMiddleware, validate(registerSchema), registerUser);
router.post('/login', authLimiter, decryptPasswordMiddleware, validate(loginSchema), loginUser);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.put('/password/update', isAuthenticatedUser, decryptPasswordMiddleware, validate(updatePasswordSchema), updatePassword);
router.post(
  '/password/reset/:token',
  validate(resetPasswordParamsSchema, 'params'),
  decryptPasswordMiddleware,
  validate(resetPasswordSchema, 'body'),
  resetPassword,
);
router.get('/refresh-token', refreshLimiter, refreshToken);
router.get('/logout', isAuthenticatedUser, logoutUser);

module.exports = router;
