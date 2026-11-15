const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Don't print pid, hostname in prod - clean logs
  serializers: {
    err: pino.stdSerializers.err,
  },
  base: {
    env: process.env.NODE_ENV,
    service: process.env.APP_NAME || 'SUFFAH MODEL SCHOOL API',
  },
  // NEVER log passwords, tokens, OTP - School ke liye extra fields add kiye
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.confirmPassword',
      'req.body.newPassword',
      'req.body.otp',
      'req.body.resetToken',
      'req.body.refreshToken',
      'password',
      '*.password',
      '*.otp',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  // Pretty in dev, JSON in prod (for Datadog/CloudWatch)
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l Z',
            ignore: 'pid,hostname,env,service',
          },
        }
      : undefined,
});

module.exports = logger;