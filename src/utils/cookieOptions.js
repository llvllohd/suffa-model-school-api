const isProd = process.env.NODE_ENV === 'production';

const baseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
};

const MINUTES = parseInt(process.env.COOKIE_EXPIRATION, 10) || 15; // 15 minutes
const DAYS = parseInt(process.env.COOKIE_REFRESH_EXPIRATION, 10) || 7; // 7 days

exports.getCookieOptionsForToken = () => ({
  ...baseOptions,
  maxAge: MINUTES * 60 * 1000, // 15 minutes
  expires: new Date(Date.now() + MINUTES * 60 * 1000),
});

exports.getCookieOptionsForRefreshToken = () => ({
  ...baseOptions,
  maxAge: DAYS * 24 * 60 * 60 * 1000, // 7 days
  expires: new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000),
});

exports.getClearCookieOptions = () => ({
  ...baseOptions,
  maxAge: 0,
  expires: new Date(0),
});
