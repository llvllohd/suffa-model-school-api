const express = require('express');
const helmet = require('helmet'); // Security headers (XSS, Clickjacking protection)
const cors = require('cors'); // Cross-Origin Resource Sharing
const cookieParser = require('cookie-parser'); // Parse cookies for JWT refresh token
const fileUpload = require('express-fileupload'); // Handle image uploads for halls
const mongoSanitize = require('express-mongo-sanitize'); // Prevent NoSQL injection
const xss = require('xss-clean'); // Prevent XSS attacks
const hpp = require('hpp'); // Prevent HTTP Parameter Pollution

const httpLogger = require('./middlewares/httpLogger.middleware'); // Logs every request with requestId
const errorHandler = require('./middlewares/error.middleware'); // Global error handler
const ApiError = require('./utils/apiError'); // Custom error class

// ==================== ROUTE IMPORTS ====================
// Public routes - no auth needed (customer facing)
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const publicHallRoutes = require('./modules/halls/public/hall.public.routes');
const publicBookingRoutes = require('./modules/bookings/public/booking.public.routes');

// Admin routes - protected by hall_owner / super_admin role
const adminDasboardRoutes = require('./modules/dashboard/dashboard.routes');
const adminHallRoutes = require('./modules/halls/admin/hall.admin.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const adminBookingRoutes = require('./modules/bookings/admin/booking.admin.routes');
const categoryRoutes = require('./modules/inventory/categories/category.routes');
const transactionRoutes = require('./modules/inventory/transactions/transaction.routes');

const app = express();

// ==================== EXPRESS CONFIG ====================
app.set('query parser', 'extended'); // Allows nested query parsing?filter[date]=2024
app.set('trust proxy', 1); // Trust first proxy (needed for rate limiting on Vercel/Render/Nginx)

// ==================== 1. LOGGER - FIRST MIDDLEWARE ====================
// Logs method, URL, status, response time with unique requestId for debugging
app.use(httpLogger);

// ==================== 2. SECURITY HEADERS ====================
// Sets 15+ security headers (X-DNS-Prefetch, X-Frame-Options, etc)
app.use(helmet());

// ==================== 3. CORS ====================
// Only allow your frontend to call API, with credentials (cookies)
app.use(
  cors({
    origin: process.env.LOCALHOST || process.env.FRONTEND_URL,
    credentials: true, // Allow cookies to be sent cross-origin
  }),
);

// ==================== 4. BODY PARSERS ====================
app.use(cookieParser()); // Must before auth - reads refreshToken from cookie
app.use(express.json({ limit: '100kb' })); // Limit prevents large payload DOS attack
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // For form-data

// ==================== 5. DATA SANITIZATION ====================
// Example: { "email": { "$gt": "" } } => sanitized to { "email": "" } (blocks NoSQL injection)
app.use(mongoSanitize());
// Example: <script>alert(1)</script> => &lt;script&gt; (blocks XSS)
app.use(xss());
// Example:?sort=price&sort=name => only last value taken (blocks HPP)
app.use(hpp());

// ==================== 6. FILE UPLOAD ====================
app.use(
  fileUpload({
    useTempFiles: true, // Saves file to /tmp/ first, not RAM (prevents memory overload)
    tempFileDir: '/tmp/', // Temp directory
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max - prevents large file DOS
    abortOnLimit: true, // Immediately abort if exceeds limit
  }),
);

// ==================== 7. HEALTH CHECK ====================
// Used by Render/Vercel/UptimeRobot to check if server is alive
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: `${process.env.APP_NAME} is running`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), // How long server running
    requestId: req.id, // For tracing logs
  });
});

// ==================== 8. API ROUTES ====================
// --- Public Routes ---
app.use('/api/v1/auth', authRoutes); // /register, /login, /forgot-password (has own rate limiters)
app.use('/api/v1/users', userRoutes); // /me, /update profile
app.use('/api/v1/halls', publicHallRoutes); // Customer sees available halls
app.use('/api/v1/bookings', publicBookingRoutes); // Customer creates booking

// --- Admin Routes (protected: isAuthenticatedUser + authorizedRole('hall_owner','super_admin')) ---
app.use('/api/v1/admin/dashboard', adminDasboardRoutes); // Revenue stats
app.use('/api/v1/admin/halls', adminHallRoutes); // CRUD halls
app.use('/api/v1/admin/upload', uploadRoutes); // Upload hall images
app.use('/api/v1/admin/bookings', adminBookingRoutes); // Manage bookings
app.use('/api/v1/admin/categories', categoryRoutes); // Income/Expense categories
app.use('/api/v1/admin/transactions', transactionRoutes); // Track money flow

// ==================== 9. UNKNOWN ROUTE HANDLER ====================
// If no route matched above, throw 404 (must be after all routes)
app.all('*', (req, res, next) => {
  next(new ApiError(`Route ${req.originalUrl} not found`, 404));
});

// ==================== 10. GLOBAL ERROR HANDLER ====================
// Catches all errors thrown via next(err) - MUST be last middleware
// Handles: ApiError, Mongoose validation, JWT errors, Multer errors
app.use(errorHandler);

module.exports = app;
