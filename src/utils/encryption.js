const CryptoJS = require('crypto-js');
const ApiError = require('./apiError');

const SECRET_KEY = process.env.PASSWORD_SECRET_KEY;

exports.encryptPassword = (plainPassword) => {
  return CryptoJS.AES.encrypt(plainPassword, SECRET_KEY).toString();
};

exports.decryptPassword = (encryptedPassword, message = 'Invalid password') => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
  const plainPassword = bytes.toString(CryptoJS.enc.Utf8);
  if (!plainPassword) throw new ApiError(message, 400);
  return plainPassword;
};
