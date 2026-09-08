const { getCookieOptionsForToken, getCookieOptionsForRefreshToken } = require('./cookieOptions');

const sendToken = (user, statusCode, res, message) => {
  const token = user.generateToken();
  const refreshToken = user.generateRefreshToken();

  const { _id, name, email, phone, role, avatar, createdAt } = user;

  res
    .status(statusCode)
    .cookie('token', token, getCookieOptionsForToken()) // 15 minutes for access token
    .cookie('refreshToken', refreshToken, getCookieOptionsForRefreshToken()) // 7 days for refresh token
    .json({
      success: true,
      message,
      user: { _id, name, email, phone, role, avatar, createdAt },
    });
};

module.exports = sendToken;
