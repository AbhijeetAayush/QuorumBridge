/**
 * Validator Lambda Handler
 * Triggered by DynamoDB Streams when new signatures arrive
 * 
 * Design Patterns:
 * - Observer Pattern: Reacts to DynamoDB Stream events
 * - Strategy Pattern: Different validation strategies
 * - Chain of Responsibility: Multiple validation steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Validates consensus and triggers execution
 * - Open/Closed: New validation rules can be added
 * - Dependency Inversion: Depends on service abstractions
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const consensusValidator = require('./consensus');
const dynamoService = require('../../shared/services/dynamoService');
const logger = require('../../shared/utils/logger');

const lambdaClient = new LambdaClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

/**
 * Lambda handler function
 * @param {Object} event - DynamoDB Stream event
 */
exports.handler = async (event) => {
  logger.info('Validator Lambda invoked', { recordCount: event.Records?.length });

  const results = [];

  try {
    // Process each DynamoDB Stream record
    for (const record of event.Records) {
      try {
        // Only process INSERT events (new signatures)
        if (record.eventName !== 'INSERT') {
          logger.debug('Skipping non-INSERT event', { eventName: record.eventName });
          continue;
        }

        // Extract new signature data
        const newImage = record.dynamodb.NewImage;
        
        // Only process signature entities
        if (!newImage.SK?.S?.startsWith('SIGNATURE#')) {
          logger.debug('Skipping non-signature entity', { SK: newImage.SK?.S });
          continue;
        }

        const eventId = newImage.eventId?.S;
        if (!eventId) {
          logger.warn('Signature record missing eventId', { record });
          continue;
        }

        logger.info('Processing new signature', { eventId });

        // Validate consensus for this event
        const result = await validateAndTriggerExecution(eventId);
        results.push(result);

      } catch (error) {
        logger.error('Failed to process stream record', error, { record });
        results.push({ 
          success: false, 
          error: error.message 
        });
      }
    }

    return {
      statusCode: 200,
      body: {
        processed: results.length,
        results
      }
    };

  } catch (error) {
    logger.error('Validator Lambda failed', error);
    return {
      statusCode: 500,
      body: {
        error: error.message
      }
    };
  }
};

/**
 * Validate consensus and trigger executor if ready
 * Implements Chain of Responsibility Pattern
 */
async function validateAndTriggerExecution(eventId) {
  try {
    // Get event data with all signatures
    const eventData = await dynamoService.getEventData(eventId);
    
    if (!eventData || !eventData.event) {
      logger.warn('Event not found', { eventId });
      return { 
        eventId, 
        success: false, 
        reason: 'Event not found' 
      };
    }

    // Check if already executed
    if (eventData.execution && eventData.execution.status === 'COMPLETED') {
      logger.info('Event already executed', { eventId });
      return { 
        eventId, 
        success: true, 
        reason: 'Already executed',
        skipped: true
      };
    }

    // Validate consensus
    const consensusResult = await consensusValidator.validateFullConsensus(
      eventData.event,
      eventData.signatures
    );

    logger.info('Consensus validation result', { 
      eventId, 
      isValid: consensusResult.isValid,
      signatures: eventData.signatures.length
    });

    // Determine action
    const action = consensusValidator.determineAction(
      consensusResult, 
      eventData.event.status
    );

    if (action.action === 'WAIT') {
      logger.info('Waiting for more signatures', { 
        eventId,
        current: consensusResult.validSignatures,
        required: consensusResult.requiredSignatures
      });
      return { 
        eventId, 
        success: true, 
        action: 'WAIT',
        reason: action.reason
      };
    }

    if (action.action === 'ERROR') {
      logger.error('Invalid action determined', { eventId, action });
      return { 
        eventId, 
        success: false, 
        reason: action.reason 
      };
    }

    // Consensus reached - invoke Executor Lambda
    logger.info('Consensus reached, invoking Executor', { eventId, action });

    // Create execution record
    await dynamoService.upsertExecution({
      eventId,
      status: 'PENDING',
      retryCount: 0
    });

    // Invoke Executor Lambda
    const executorPayload = {
      eventId,
      action: action.action,
      targetChain: action.targetChain,
      method: action.method,
      eventData: eventData.event
    };

    await invokeLambda(
      process.env.EXECUTOR_LAMBDA_NAME || 'ExecutorFunction',
      executorPayload
    );

    logger.info('Executor Lambda invoked successfully', { eventId });

    return {
      eventId,
      success: true,
      action: action.action,
      executorInvoked: true
    };

  } catch (error) {
    logger.error('Failed to validate and trigger execution', error, { eventId });
    return {
      eventId,
      success: false,
      error: error.message
    };
  }
}

/**
 * Invoke another Lambda function asynchronously
 * Implements Command Pattern
 */
async function invokeLambda(functionName, payload) {
  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event', // Asynchronous invocation
      Payload: JSON.stringify(payload)
    });

    await lambdaClient.send(command);
    logger.info('Lambda invoked', { functionName });
  } catch (error) {
    logger.error('Failed to invoke Lambda', error, { functionName });
    throw error;
  }
}
