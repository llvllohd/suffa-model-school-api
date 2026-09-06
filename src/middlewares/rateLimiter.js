const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
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
    next(new ApiError('Too many password reset attempts, try after an hour', 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});
