const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      logger.fatal('MONGO_URI is missing in .env - shutting down');
      process.exit(1);
    }

    const conn = await mongoose.connect(MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host} | DB: ${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected - trying to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'MongoDB connection failed - shutting down');
    process.exit(1);
  }
};

module.exports = connectDB;
