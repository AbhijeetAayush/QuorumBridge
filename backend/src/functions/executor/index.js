/**
 * Executor Lambda Handler
 * Executes cross-chain operations (mint/unlock) after consensus
 * 
 * Design Patterns:
 * - Command Pattern: Encapsulates execution requests
 * - Strategy Pattern: Different strategies for mint/unlock
 * - Template Method: Common execution flow
 * 
 * SOLID Principles:
 * - Single Responsibility: Orchestrates cross-chain execution
 * - Open/Closed: New operations can be added
 * - Dependency Inversion: Depends on handler abstractions
 */

const mintHandler = require('./mintHandler');
const unlockHandler = require('./unlockHandler');
const dynamoService = require('../../shared/services/dynamoService');
const logger = require('../../shared/utils/logger');

/**
 * Lambda handler function
 * @param {Object} event - Execution event from Validator Lambda
 */
exports.handler = async (event) => {
  logger.info('Executor Lambda invoked', { event });

  try {
    const { eventId, action, eventData } = event;

    if (!eventId || !action || !eventData) {
      throw new Error('Missing required parameters: eventId, action, or eventData');
    }

    logger.info('Executing cross-chain operation', { eventId, action });

    // Update execution status to IN_PROGRESS
    await dynamoService.upsertExecution({
      eventId,
      status: 'IN_PROGRESS',
      retryCount: 0
    });

    // Execute based on action type
    let result;
    try {
      result = await executeAction(action, eventData);
    } catch (executionError) {
      logger.error('Execution failed', executionError, { eventId, action });
      
      // Update execution status to FAILED
      await dynamoService.upsertExecution({
        eventId,
        status: 'FAILED',
        error: executionError.message
      });

      return {
        statusCode: 500,
        body: {
          eventId,
          action,
          success: false,
          error: executionError.message
        }
      };
    }

    // Update execution status to COMPLETED
    await dynamoService.upsertExecution({
      eventId,
      status: 'COMPLETED',
      txHash: result.txHash,
      retryCount: 0
    });

    // Update event status
    const newStatus = action === 'MINT' ? 'MINTED' : 'UNLOCKED';
    const chain = action === 'MINT' ? 'ETHEREUM' : 'ARBITRUM';
    await dynamoService.updateEventStatus(eventId, newStatus, chain);

    logger.info('Execution completed successfully', { 
      eventId, 
      action,
      txHash: result.txHash
    });

    return {
      statusCode: 200,
      body: {
        eventId,
        action,
        success: true,
        ...result
      }
    };

  } catch (error) {
    logger.error('Executor Lambda failed', error);
    return {
      statusCode: 500,
      body: {
        error: error.message
      }
    };
  }
};

/**
 * Execute action based on type
 * Implements Strategy Pattern
 */
async function executeAction(action, eventData) {
  switch (action) {
    case 'MINT':
      mintHandler.validateMintParams(eventData);
      return await mintHandler.executeMint(eventData);
      
    case 'UNLOCK':
      unlockHandler.validateUnlockParams(eventData);
      return await unlockHandler.executeUnlock(eventData);
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
