const baseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};

const MINUTES = parseInt(process.env.COOKIE_EXPIRATION, 10) || 15; // 15 minutes
const DAYS = parseInt(process.env.COOKIE_REFRESH_EXPIRATION, 10) || 7; // 7 days

exports.getCookieOptionsForToken = () => ({
  ...baseOptions,
  expires: new Date(Date.now() + MINUTES * 60 * 1000),
});

exports.getCookieOptionsForRefreshToken = () => ({
  ...baseOptions,
  expires: new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000),
});

exports.getClearCookieOptions = () => baseOptions;
