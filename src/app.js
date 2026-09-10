const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');

const httpLogger = require('./middlewares/httpLoggerMiddleware');
// const requestIdHeader = require('./middlewares/requestIdHeader');
const errorHandler = require('./middlewares/errorMiddleware');
const ApiError = require('./utils/apiError');

// Routes imports
const authRoutes = require('./modules/auth/authRoutes');
const userRoutes = require('./modules/users/userRoutes');
const hallRoutes = require('./modules/halls/hallRoutes');

const app = express();

app.set('query parser', 'extended');
app.set('trust proxy', 1);

// 1. Logger - FIRST, to log all requests with requestId
app.use(httpLogger);

// 2. Security headers
app.use(helmet());

// 3. CORS - BEFORE body parsers & file upload
app.use(
  cors({
    origin: process.env.FRONTEND_URL || process.env.LOCALHOST,
    credentials: true,
  }),
);

// 4. Body parsers
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 5. File upload - AFTER parsers, AFTER cors
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
  }),
);

// 6. Health check & API Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: `${process.env.APP_NAME} is running`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.id,
  });
});

// 7. Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/halls', hallRoutes);

// 8. Unknown route catcher
app.all('*', (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  next(new ApiError(message, 404));
});

// 9. Global Error Handler - must be last
app.use(errorHandler);

module.exports = app;
