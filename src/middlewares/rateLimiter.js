const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  handler: (req, res, next) => {
    next(new ApiError('Too many attempts, please try again after 15 minutes', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  handler: (req, res, next) => {
    next(new ApiError('Too many attempts, please try again after an hour', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  handler: (req, res, next) => {
    next(new ApiError('Too many attempts, please try again later', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.hallSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // 100 requests per 15min for search
  message: 'Too many search requests, try again later',
});
