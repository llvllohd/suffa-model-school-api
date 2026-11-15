require('module-alias/register');
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('@/app');
const connectDB = require('@/config/db');
const logger = require('@/utils/logger');

const PORT = process.env.PORT || 5000;
const APP_NAME = process.env.APP_NAME || 'SUFFAH MODEL SCHOOL API';

// 1. Uncaught Exception - e.g. syntax error, must shutdown
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'UNCAUGHT EXCEPTION - Shutting down');
  process.exit(1);
});

// 2. Connect DB then Start Server
// Server starts only after DB is connected - prevents requests before DB is ready
let server;

const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    logger.info(`${APP_NAME} is running here: http://localhost:${PORT} in ${process.env.NODE_ENV} mode`);
  });
};

startServer().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});

// 3. Unhandled Promise Rejection - e.g. DB connection fail
process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'UNHANDLED REJECTION - Shutting down server');
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// 4. Graceful Shutdown - for Render / Docker / PM2
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully`);

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      // Close MongoDB connection as well - prevents hanging connections on Render
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
