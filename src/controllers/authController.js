const User = require('../models/User');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ApiError = require('../utils/ApiError');
const sendToken = require('../utils/sendToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getCookieOptionsForToken, getClearCookieOptions } = require('../utils/cookieOptions');

// Register User
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) return next(new ApiError('Email already exists.', 400));

  const user = await User.create({ name, email, password, sourceType: 'normal', ...(phone && { phone }) });

  sendToken(user, 201, res, 'Registered successfully');
});

// Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  let { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) return next(new ApiError('Invalid email or password.', 401));

  if (user.sourceType !== 'normal') {
    return next(new ApiError(`Please login via ${user.sourceType}.`, 400));
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) return next(new ApiError('Invalid email or password.', 401));

  sendToken(user, 200, res, 'Logged in successfully');
});

// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email, url } = req.body;

  const user = await User.findOne({ email });
  if (!user) return next(new ApiError('Invalid email', 404));

  // Get Reset Password Token
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${url.replace(/\/$/, '')}/${resetToken}`;

  try {
    await sendEmail({
      mail: user.email,
      resetPasswordUrl,
    });
    res.status(200).json({
      status: true,
      message: `An email has been sent to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ApiError(error.message, 500));
  }
});

// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body; // already decrypted & validated by Joi

  // Create Hash Value using token
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });

  if (!user) return next(new ApiError('Your password reset link is invalid or has been expired.', 400));

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save(); // keep validations ON

  sendToken(user, 200, res, 'Your password has been changed successfully');
});

// Refresh Token
exports.refreshToken = catchAsyncErrors(async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }

  const token = user.generateToken();

  res
    .status(200)
    .cookie('token', token, getCookieOptionsForToken()) // 15 minutes for access token
    .json({
      success: true,
      message: 'Token refreshed successfully',
    });
});

// Logout User
exports.logoutUser = catchAsyncErrors(async (req, res, next) => {
  res.clearCookie('token', getClearCookieOptions());
  res.clearCookie('refreshToken', getClearCookieOptions());

  res.status(200).json({
    status: true,
    message: 'Logged out successfully.',
  });
});
