const pinoHttp = require('pino-http');
const crypto = require('crypto');
const logger = require('../utils/logger');

const httpLogger = pinoHttp({
  logger,

  // Generate requestId for every request
  genReqId: (req) => {
    const incoming = req.headers['x-request-id'];
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return incoming && uuidV4Regex.test(incoming) ? incoming : crypto.randomUUID();
  },

  // This stops full req/res dump
  serializers: {
    req: () => undefined,
    res: () => undefined,
    err: () => undefined,
  },

  // Clean log line
  customLogLevel: (req, res) => {
    if (res.statusCode >= 500) return 'error';
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
