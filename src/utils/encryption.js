const CryptoJS = require('crypto-js');
const ApiError = require('./apiError');

const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY;

exports.encryptPassword = (plainPassword) => {
  try {
    return CryptoJS.AES.encrypt(plainPassword, ENCRYPTION_KEY).toString();
  } catch (error) {
    throw new ApiError('Something went wrong. Please try again.', 400);
  }
};

exports.decryptPassword = (encryptedPassword, message = 'Invalid password') => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
    const plainPassword = bytes.toString(CryptoJS.enc.Utf8);
    if (!plainPassword) throw new ApiError(message, 400);
    return plainPassword;
  } catch (error) {
    throw new ApiError('Something went wrong. Please try again.', 400);
  }
};
