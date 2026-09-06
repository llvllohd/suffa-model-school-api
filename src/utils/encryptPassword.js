const CryptoJS = require('crypto-js');

const encryptPassword = (plainPassword) => {
  return CryptoJS.AES.encrypt(plainPassword, process.env.PASSWORD_ENCRYPTION_KEY).toString();
};

module.exports = encryptPassword;
