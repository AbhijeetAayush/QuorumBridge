/**
 * Custom Error Classes following SOLID principles
 * Implements Factory Pattern for error creation
 * 
 * SOLID Principles:
 * - Single Responsibility: Each error class handles one type of error
 * - Open/Closed: Can extend with new error types without modifying existing
 * - Liskov Substitution: All errors can replace base Error class
 */

class BridgeError extends Error {
  constructor(message, code = 'BRIDGE_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

class Web3Error extends BridgeError {
  constructor(message, details = {}) {
    super(message, 'WEB3_ERROR', details);
  }
}

class DynamoDBError extends BridgeError {
  constructor(message, details = {}) {
    super(message, 'DYNAMODB_ERROR', details);
  }
}

class ValidationError extends BridgeError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

class ConsensusError extends BridgeError {
  constructor(message, details = {}) {
    super(message, 'CONSENSUS_ERROR', details);
  }
}

class EventProcessingError extends BridgeError {
  constructor(message, details = {}) {
    super(message, 'EVENT_PROCESSING_ERROR', details);
  }
}

/**
 * Error Handler Factory
 * Implements Factory Pattern
 */
class ErrorFactory {
  static createError(type, message, details = {}) {
    const errorMap = {
      web3: Web3Error,
      dynamodb: DynamoDBError,
      validation: ValidationError,
      consensus: ConsensusError,
      eventProcessing: EventProcessingError
    };

    const ErrorClass = errorMap[type] || BridgeError;
    return new ErrorClass(message, details);
  }

  static isRetryable(error) {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'DYNAMODB_THROTTLE'
    ];
    return retryableCodes.includes(error.code);
  }
}

module.exports = {
  BridgeError,
  Web3Error,
  DynamoDBError,
  ValidationError,
  ConsensusError,
  EventProcessingError,
  ErrorFactory
};
