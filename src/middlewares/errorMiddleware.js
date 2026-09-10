const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');
const { getClearCookieOptions } = require('../utils/cookieOptions');

/**
 * Global Error Handler Middleware
 * Must be last middleware in app.js after all routes
 * 4 params (err, req, res, next) - Express detects it as error handler
 */

const errorHandler = (err, req, res, next) => {
  let error = err;
  error.message = err.message || 'Internal Server Error';
  error.statusCode = err.statusCode || 500;

  // ========== MONGOOSE ERRORS ==========

  // Invalid MongoDB ObjectId: /api/halls/abc123
  if (err.name === 'CastError') {
    const message = `Invalid ID format: ${err.value}`;
    error = new ApiError(message, 400);
  }

  // Duplicate key: email already exists - MongoDB code 11000
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists. Please use another ${field}`;
    error = new ApiError(message, 400);
  }

  // Schema validation: required, min, validator.isEmail etc
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    error = new ApiError(messages, 400);
  }

  // Document not found: findByIdAndUpdate with non-existing id
  if (err.name === 'DocumentNotFoundError') {
    const message = `Resource not found`;
    error = new ApiError(message, 404);
  }

  // Version conflict: two users updating same hall at same time
  if (err.name === 'VersionError') {
    const message = 'Resource was busy. Please refresh and try again';
    error = new ApiError(message, 409);
  }

  // ========== JWT ERRORS ==========

  // Token expired after 7d / Token tampered/invalid
  if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
    // If this error came from refresh route, clear cookies
    if (req.path.includes('refresh-token')) {
      res.clearCookie('token', getClearCookieOptions());
      res.clearCookie('refreshToken', getClearCookieOptions());
    }
    const message = 'Your session has timed out. Please login again.';
    error = new ApiError(message, 401);
  }

  // ========== FILE UPLOAD ERRORS ==========

  // File size > 5MB limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large. Max 5MB allowed per image';
    error = new ApiError(message, 400);
  }

  req.errorMessage = error.message;

  // ========== LOGGING ==========
  // LOG ONLY 500 - not 4xx
  // 4xx will be logged automatically by httpLogger - don't log here
  if (error.statusCode >= 500) {
    logger.error(
      {
        err, // Pino will log stack automatically
        path: req.originalUrl,
        method: req.method,
        requestId: req.id,
        userId: req.user?.id || 'guest',
        ip: req.ip,
      },
      error.message,
    );
  }

  // ========== FINAL RESPONSE TO FRONTEND ==========

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    requestId: req.id,
    // Show stack only in development, hide in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
