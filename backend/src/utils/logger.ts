import pino from 'pino';

/**
 * Centralized logging utility for VelocityMesh backend
 * Uses Pino for high-performance structured logging
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Configure Pino logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Pretty print in development
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }),

  // Production configuration
  ...(isProduction && {
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'cookie',
        'api_key',
        'secret'
      ],
      censor: '[REDACTED]'
    }
  }),

  // Base fields for all logs
  base: {
    service: 'velocitymesh-backend',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development'
  }
});

// Create child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

// Export logger instance as default
export default logger;