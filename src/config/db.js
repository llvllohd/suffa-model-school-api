const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.fatal({ err: error }, 'MongoDB connection failed - shutting down');
    process.exit(1);
  }
};

module.exports = connectDB;
