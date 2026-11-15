const jwt = require('jsonwebtoken');

const User = require('@/modules/users/user.model');
const ApiError = require('@/utils/apiError');
const asyncHandlerMiddleware = require('./asyncHandler.middleware');

exports.isAuthenticatedUser = asyncHandlerMiddleware(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next(new ApiError('Your session has timed out. Please login.', 401));

  const decodedData = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

  const user = await User.findById(decodedData.id).select('_id name email phone role avatar createdAt isActive').lean();

  if (!user || !user.isActive) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }

  const { isActive: _isActive, ...safeUser } = user;
  // ✅ Fix logout: auth.controller uses req.user.id
  req.user = { ...safeUser, id: user._id.toString() };
  next();
});

// ✅ Name matches routes
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
    }
    next();
  };
};
