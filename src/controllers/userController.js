const catchAsyncErrors = require('../middlewares/catchAsyncErrors');

exports.getMe = catchAsyncErrors(async (req, res, next) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});
