const User = require('./user.model');
const ApiError = require('../../utils/apiError');
const sendToken = require('../../utils/sendToken');

exports.getMe = async (req, res, next) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

exports.updatePassword = async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
  if (!isPasswordMatched) {
    return next(new ApiError('The old password you entered is incorrect', 400));
  }
  user.password = req.body.newPassword;
  await user.save();
  sendToken(user, 200, res);
};
