const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');
const catchAsyncErrors = require('./asyncHandlerMiddleware');
const User = require('../modules/users/userModel');
const Hall = require('../modules/halls/hall.model');

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) return next(new ApiError('Your session has timed out. Please login.', 401));

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decodedData.id).select('_id name email phone role avatar createdAt').lean();

  if (!user) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }
  req.user = user;
  if (user?.role === 'hall_owner') {
    const hall = await Hall.findOne({ owner: user._id }).select('name slug').lean();
    req.user.hallName = hall?.name || null;
    req.user.hallId = hall?._id || null;
    req.user.hallSlug = hall?.slug || null;
  }
  if (user?.role === 'super_admin') {
    req.user.hallName = 'Super Admin';
    req.user.hallId = null;
    req.user.hallSlug = null;
  }
  next();
});

exports.authorizedRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return next(new ApiError(`Role: ${req.user.role} is not allowed to access this resource`, 403));
    next();
  };
};
