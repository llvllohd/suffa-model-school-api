const User = require('../users/user.model');
const ApiError = require('../../utils/apiError');
const sendToken = require('../../utils/sendToken');
const sendEmail = require('../../utils/sendEmail');
const sendOtp = require('../../utils/sendOtp');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getCookieOptionsForToken, getClearCookieOptions } = require('../../utils/cookieOptions');

// Register User
exports.registerUser = async (req, res, next) => {
  const { name, email, phone, password } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) return next(new ApiError('Email already exists.', 400));
  const user = await User.create({ name, email, password, sourceType: 'normal', ...(phone && { phone }) });
  sendToken(user, 201, res, 'Registered successfully');
};

// Login User
exports.loginUser = async (req, res, next) => {
  const LOCK_MINUTES = parseInt(process.env.LOGIN_LOCK_MINUTES, 10) || 15;
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) return next(new ApiError('Invalid email or password.', 401));
  if (user.isLocked) return next(new ApiError(`Your account is locked, please try after ${LOCK_MINUTES} min(s)`, 423));
  if (user.sourceType !== 'normal') {
    return next(new ApiError('Invalid email or password.', 401));
  }
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    await user.incrementLoginAttempts();
    return next(new ApiError('Invalid email or password.', 401));
  }
  await user.resetLoginAttempts();
  sendToken(user, 200, res, 'Logged in successfully');
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      success: true,
      message: `An email has been sent successfully.`,
    });
  }
  // Get Reset Password Token
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  try {
    await sendEmail({
      mail: user.email,
      resetPasswordUrl,
    });
    res.status(200).json({
      success: true,
      message: `An email has been sent to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ApiError('Failed to send email. Please try again.', 500));
  }
};

//Forgot Password OTP
exports.forgotPasswordOtp = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      success: true,
      message: `An OTP has been sent successfully.`,
    });
  }
  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });
  try {
    await sendOtp({
      mail: user.email,
      otp,
    });
    res.status(200).json({
      success: true,
      message: `An OTP has been sent to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ApiError('Failed to send email. Please try again.', 500));
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body; // already decrypted & validated by Joi
  // Create Hash Value using token
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });
  if (!user) return next(new ApiError('Your password reset link is invalid or has been expired.', 400));
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  await user.save(); // keep validations ON
  sendToken(user, 200, res, 'Your password has been changed successfully');
};

// Verify OTP
exports.verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpire');
  if (!user || !user.verifyOTP(otp)) {
    return next(new ApiError('OTP is invalid or has expired.', 400));
  }
  // Clear OTP immediately — single use
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpire = undefined;
  await user.save({ validateBeforeSave: false });
  // Issue a short-lived OTP session token — proof that OTP was validated
  const otpSessionToken = jwt.sign(
    { id: user._id, purpose: 'otp-reset' },
    process.env.JWT_SECRET,
    { expiresIn: `${parseInt(process.env.OTP_EXPIRE, 10) || 10}m`, algorithm: 'HS256' },
  );
  res.status(200).json({
    success: true,
    message: 'OTP verified successfully.',
    otpSessionToken,
  });
};

// Reset Password with OTP Session Token
exports.resetPasswordWithOtp = async (req, res, next) => {
  const { otpSessionToken, password } = req.body;
  let decoded;
  try {
    decoded = jwt.verify(otpSessionToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return next(new ApiError('Session expired. Please request a new OTP.', 400));
  }
  if (decoded.purpose !== 'otp-reset') {
    return next(new ApiError('Session expired. Please request a new OTP.', 400));
  }
  const user = await User.findById(decoded.id);
  if (!user) return next(new ApiError('Session expired. Please request a new OTP.', 400));
  user.password = password;
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  await user.save();
  sendToken(user, 200, res, 'Your password has been changed successfully');
};

// Refresh Token
exports.refreshToken = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }
  if (decoded.version !== user.refreshTokenVersion) {
    return next(new ApiError('Your session has timed out. Please login.', 401));
  }
  const token = user.generateToken();
  res.status(200).cookie('token', token, getCookieOptionsForToken()).json({
    success: true,
    message: 'Token refreshed successfully',
  });
};

// Logout User
exports.logoutUser = async (req, res, next) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { refreshTokenVersion: 1 } });
  res.clearCookie('token', getClearCookieOptions());
  res.clearCookie('refreshToken', getClearCookieOptions());
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};
