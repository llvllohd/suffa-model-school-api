const catchAsyncErrors = require('./asyncHandler.middleware');
const ApiError = require('../utils/apiError');

exports.isApiKey = catchAsyncErrors(async (req, res, next) => {
  // skip for health check
  if (req.originalUrl === '/health') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) return next(new ApiError('You are not allowed to access this resource', 403));
  next();
});
