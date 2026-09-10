const { decryptPassword } = require('../utils/encryption');
const catchAsyncErrors = require('./asyncHandlerMiddleware');

const decryptPasswordMiddleware = catchAsyncErrors(async (req, res, next) => {
  const fieldsToDecrypt = ['password', 'oldPassword', 'newPassword', 'confirmPassword'];
  for (const field of fieldsToDecrypt) {
    if (req.body[field]) {
      req.body[field] = decryptPassword(req.body[field]);
    }
  }
  next();
});

module.exports = decryptPasswordMiddleware;
