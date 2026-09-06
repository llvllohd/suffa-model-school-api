const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const httpLogger = pinoHttp({
  logger,

  // Generate requestId for every request
  genReqId: (req) => req.headers['x-request-id'] || uuidv4(),

  // This stops full req/res dump
  serializers: {
    req: () => undefined,
    res: () => undefined,
    err: () => undefined,
  },

  // Clean log line
  customLogLevel: (req, res) => {
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,

  // Don't log health, favicon
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/favicon.ico',
  },

  // Log only what we need - industry standard
  customProps: (req, res) => ({
    requestId: req.id,
    userId: req.user?.id || 'guest',
    ...(res.statusCode >= 400 && req.errorMessage && { errorMessage: req.errorMessage }),
  }),
});

module.exports = httpLogger;
