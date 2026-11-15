const rateLimit = require('express-rate-limit');
const ApiError = require('@/utils/apiError');

// ✅ Key by phone/email + IP - One attacker can't lock out whole school
// School NAT: 100 users, 1 IP, but 100 different phones = 100 separate buckets

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => `${req.ip}:${req.body?.phone || 'unknown'}`,
  handler: (req, res, next) => {
    next(new ApiError('Too many attempts, please try again after 15 minutes', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => `${req.ip}:${req.body?.email?.toLowerCase() || 'unknown'}`,
  handler: (req, res, next) => {
    next(new ApiError('Too many attempts, please try again after an hour', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => `${req.ip}:${req.params?.token || req.body?.otpSessionToken || 'unknown'}`,
  handler: (req, res, next) => {
    next(new ApiError('Too many reset attempts, please try again after an hour', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next) => {
    next(new ApiError('Too many attempts, please try again later', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});
