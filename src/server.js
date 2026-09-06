require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// 1. Uncaught Exception - e.g. syntax error, must shutdown
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'UNCAUGHT EXCEPTION - Shutting down');
  process.exit(1);
});

// 2. Connect DB
connectDB();

// 3. Start Server
const server = app.listen(PORT, () => {
  logger.info(`Server is running here: http://localhost:${PORT} in ${process.env.NODE_ENV} mode`);
});

// 4. Unhandled Promise Rejection - e.g. DB connection fail
process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'UNHANDLED REJECTION - Shutting down server');
  server.close(() => {
    process.exit(1);
  });
});

// 5. Graceful Shutdown - for Render / Docker / PM2
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});
