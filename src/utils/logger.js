const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Don't print pid, hostname in prod - clean logs
  serializers: {
    err: pino.stdSerializers.err, // <-- add this
  },
  base: {
    env: process.env.NODE_ENV,
    service: process.env.APP_NAME,
  },
  // NEVER log passwords, tokens
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'req.body.confirmPassword', 'password', '*.password'],
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
