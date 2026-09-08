const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const sendToken = require('../utils/sendToken');

exports.getMe = catchAsyncErrors(async (req, res, next) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
  if (!isPasswordMatched) {
    return next(new ApiError('The old password you entered is incorrect', 400));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendToken(user, 200, res);
});
