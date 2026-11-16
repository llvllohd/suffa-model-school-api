const express = require('express');
const helmet = require('helmet'); // Security headers (XSS, Clickjacking protection)
const cors = require('cors'); // Cross-Origin Resource Sharing
const cookieParser = require('cookie-parser'); // Parse cookies for JWT refresh token
const mongoSanitize = require('express-mongo-sanitize'); // Prevent NoSQL injection

const httpLogger = require('@/middlewares/httpLogger.middleware'); // Logs every request with requestId
const errorHandler = require('@/middlewares/error.middleware'); // Global error handler
const ApiError = require('@/utils/apiError'); // Custom error class

// ==================== ROUTE IMPORTS ====================
// Public routes - no auth needed
const authRoutes = require('@/modules/auth/auth.routes');
const userRoutes = require('@/modules/users/user.routes');

// School routes - protected
const categoryRoutes = require('@/modules/categories/category.routes');
const classRoutes = require('@/modules/classes/class.routes');
const sectionRoutes = require('@/modules/sections/section.routes');
// const studentRoutes = require('@/modules/students/student.routes');
// const teacherRoutes = require('@/modules/teachers/teacher.routes');
// const attendanceRoutes = require('@/modules/attendance/attendance.routes');
// const examRoutes = require('@/modules/exams/exam.routes');
// const dashboardRoutes = require('@/modules/dashboard/dashboard.routes');

const app = express();

// ==================== EXPRESS CONFIG ====================
app.set('query parser', 'extended'); // Allows nested query parsing ?filter[date]=2024
app.set('trust proxy', 1); // Trust first proxy (needed for rate limiting on Vercel/Render/Nginx)

// ==================== 1. LOGGER - FIRST MIDDLEWARE ====================
// Logs method, URL, status, response time with unique requestId for debugging
app.use(httpLogger);

// ==================== 2. SECURITY HEADERS ====================
// Sets 15+ security headers (X-DNS-Prefetch, X-Frame-Options, etc)
app.use(helmet());

// ==================== 3. CORS ====================
// Allow both local and live frontend, with credentials (cookies)
const allowedOrigins = [process.env.LOCALHOST, process.env.FRONTEND_URL].filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies to be sent cross-origin
  }),
);

// ==================== 4. BODY PARSERS ====================
app.use(cookieParser()); // Must be before auth - reads refreshToken from cookie
app.use(express.json({ limit: '100kb' })); // Limit prevents large payload DOS attack
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // For form-data

// ==================== 5. DATA SANITIZATION ====================
// Example: { "email": { "$gt": "" } } => sanitized to { "email": "" } (blocks NoSQL injection)
app.use(mongoSanitize());

// ==================== 6. HEALTH CHECK ====================
// Used by Render/Vercel/UptimeRobot to check if server is alive
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: `${process.env.APP_NAME} is running`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), // How long server is running
    requestId: req.id, // For tracing logs
  });
});

// ==================== 7. API ROUTES ====================
// --- Public / Auth Routes ---
app.use('/api/v1/auth', authRoutes); // /register, /login, /forgot-password (has own rate limiters)
app.use('/api/v1/users', userRoutes); // /me, /update profile

// --- School Routes (protected: isAuthenticatedUser + authorizedRole('admin')) ---
app.use('/api/v1/categories', categoryRoutes); // CRUD categories
app.use('/api/v1/classes', classRoutes); // CRUD classes
app.use('/api/v1/sections', sectionRoutes); // CRUD sections
// app.use('/api/v1/students', studentRoutes); // CRUD students, photo URL
// app.use('/api/v1/teachers', teacherRoutes); // CRUD teachers
// app.use('/api/v1/attendance', attendanceRoutes); // Daily attendance
// app.use('/api/v1/exams', examRoutes); // Exams, marks, report card
// app.use('/api/v1/admin/dashboard', dashboardRoutes); // Total students, teachers, fees stats

// ==================== 8. UNKNOWN ROUTE HANDLER ====================
// If no route matched above, throw 404 (must be after all routes)
app.use((req, res, next) => {
  next(new ApiError(`Route ${req.originalUrl} not found`, 404));
});

// ==================== 9. GLOBAL ERROR HANDLER ====================
// Catches all errors thrown via next(err) - MUST be last middleware
// Handles: ApiError, Mongoose validation, JWT errors, Multer errors
app.use(errorHandler);

module.exports = app;
