const express = require('express');

const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordParamsSchema, resetPasswordSchema } = require('../validators/authValidator');
const { validate } = require('../middlewares/validate');
const { registerUser, loginUser, logoutUser, forgotPassword, resetPassword, refreshToken } = require('../controllers/authController');
const decryptPasswordMiddleware = require('../middlewares/decryptPasswordMiddleware');
const { isAuthenticatedUser } = require('../middlewares/auth');
const { authLimiter, forgotPasswordLimiter, refreshLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, decryptPasswordMiddleware, validate(registerSchema), registerUser);
router.post('/login', authLimiter, decryptPasswordMiddleware, validate(loginSchema), loginUser);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post(
  '/reset-password/:token',
  validate(resetPasswordParamsSchema, 'params'),
  decryptPasswordMiddleware,
  validate(resetPasswordSchema, 'body'),
  resetPassword,
);
router.get('/refresh-token', refreshLimiter, refreshToken);
router.get('/logout', isAuthenticatedUser, logoutUser);

module.exports = router;
