const CryptoJS = require('crypto-js');
const ApiError = require('./ApiError');

const decryptPassword = (encryptedPassword, message = 'Invalid password') => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, process.env.PASSWORD_ENCRYPTION_KEY);
  const plainPassword = bytes.toString(CryptoJS.enc.Utf8);
  if (!plainPassword) throw new ApiError(message, 400);
  return plainPassword;
};

module.exports = decryptPassword;
