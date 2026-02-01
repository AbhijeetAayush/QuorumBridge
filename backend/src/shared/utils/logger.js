/**
 * Logger Utility - Centralized logging following DRY principle
 * Implements Singleton Pattern for logger instance
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles logging
 * - Open/Closed: Can extend with new log levels
 * - Dependency Inversion: Applications depend on logger abstraction
 */

const winston = require('winston');

class Logger {
  constructor() {
    if (Logger.instance) {
      return Logger.instance;
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'cross-chain-bridge' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    Logger.instance = this;
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, error = null, meta = {}) {
    this.logger.error(message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null
    });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
}

// Export singleton instance
module.exports = new Logger();
