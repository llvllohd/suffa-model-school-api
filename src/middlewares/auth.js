const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const catchAsyncErrors = require('./catchAsyncErrors');
const User = require('../modules/users/userModel');

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) return next(new ApiError('Your session has timed out. Please login.', 401));
  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decodedData.id).select('_id name email phone role avatar createdAt').lean();
  if (!req.user) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }
  next();
});

exports.authorizedRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return next(new ApiError(`Role: ${req.user.role} is not allowed to access this resource`, 403));
    next();
  };
};
