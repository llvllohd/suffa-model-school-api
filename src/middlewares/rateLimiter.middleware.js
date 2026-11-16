// Rate Limiters - express-rate-limit v7+
// NOTE: Must use ipKeyGenerator(req.ip) in keyGenerator.
// Direct req.ip causes ERR_ERL_KEY_GEN_IPV6 - IPv6 users can bypass limits.
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Login / Register - 20 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// Forgot Password - Link + OTP - 5 attempts per 15 min per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// Reset Password - 5 attempts per 15 min per IP
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// Refresh Token - 30 attempts per 15 min per IP
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

module.exports = { authLimiter, forgotPasswordLimiter, resetPasswordLimiter, refreshLimiter };
