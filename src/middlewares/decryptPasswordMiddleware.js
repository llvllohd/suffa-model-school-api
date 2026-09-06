const decryptPassword = require('../utils/decryptPassword');
const catchAsyncErrors = require('./catchAsyncErrors');

module.exports = catchAsyncErrors(async (req, res, next) => {
  if (req.body.password) {
    req.body.password = decryptPassword(req.body.password);
  }
  if (req.body.confirmPassword) {
    req.body.confirmPassword = decryptPassword(req.body.confirmPassword);
  }
  next();
});
