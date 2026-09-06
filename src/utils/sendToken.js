const sendToken = (user, statusCode, res, message) => {
  const token = user.generateToken();
  const days = parseInt(process.env.COOKIE_EXPIRATION, 10) || 7; // 7 days
  const options = {
    expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };
  const { _id, name, email, phone, role, avatar, createdAt } = user;
  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    message,
    user: { _id, name, email, phone, role, avatar, createdAt },
  });
};

module.exports = sendToken;
