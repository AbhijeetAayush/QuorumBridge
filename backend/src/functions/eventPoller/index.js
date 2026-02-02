/**
 * Event Poller Lambda Handler
 * Triggered by EventBridge every 30 seconds
 * 
 * Design Patterns:
 * - Strategy Pattern: Different pollers for different chains
 * - Factory Pattern: Creates appropriate poller based on input
 * - Template Method: Common polling flow with chain-specific implementations
 * 
 * SOLID Principles:
 * - Single Responsibility: Orchestrates event polling
 * - Open/Closed: New chains can be added without modification
 * - Dependency Inversion: Depends on poller abstractions
 */

const arbitrumPoller = require('./bscPoller');
const ethPoller = require('./ethPoller');
const signingService = require('../../shared/services/signingService');
const dynamoService = require('../../shared/services/dynamoService');
const logger = require('../../shared/utils/logger');

/**
 * Lambda handler function
 * @param {Object} event - EventBridge event with relayerId
 */
exports.handler = async (event) => {
  const startTime = Date.now();
  logger.info('EventPoller Lambda invoked', { event });

  try {
    // Extract relayer ID from event
    const relayerId = event.relayerId || process.env.RELAYER_ID || '1';
    logger.info('Processing as relayer', { relayerId });

    // Poll both chains
    const results = await Promise.allSettled([
      pollAndSignEvents(arbitrumPoller, relayerId),
      pollAndSignEvents(ethPoller, relayerId)
    ]);

    // Process results
    const arbitrumResult = results[0];
    const ethResult = results[1];

    const response = {
      statusCode: 200,
      body: {
        relayerId,
        arbitrum: arbitrumResult.status === 'fulfilled' ? arbitrumResult.value : { error: arbitrumResult.reason?.message },
        ethereum: ethResult.status === 'fulfilled' ? ethResult.value : { error: ethResult.reason?.message },
        duration: Date.now() - startTime
      }
    };

    logger.info('EventPoller completed', response.body);
    return response;

  } catch (error) {
    logger.error('EventPoller Lambda failed', error);
    return {
      statusCode: 500,
      body: {
        error: error.message,
        duration: Date.now() - startTime
      }
    };
  }
};

/**
 * Poll chain and sign discovered events
 * Implements Template Method Pattern
 */
async function pollAndSignEvents(poller, relayerId) {
  try {
    // Get polling range
    const range = await poller.getPollingRange();
    if (!range) {
      return {
        chain: poller.chain,
        message: 'No new blocks to poll',
        eventsProcessed: 0
      };
    }

    // Poll for events
    const pollResult = await poller.poll(range.fromBlock, range.toBlock);

    // Sign each event discovered
    const signedEvents = [];
    for (const eventData of pollResult.events || []) {
      try {
        const signatureData = await signingService.signEventData(relayerId, eventData);
        
        // Store signature in DynamoDB
        await dynamoService.createSignature({
          eventId: eventData.eventId,
          relayerId,
          signature: signatureData.signature,
          publicKey: signatureData.publicKey
        });

        signedEvents.push({
          eventId: eventData.eventId,
          signed: true
        });

        logger.info('Event signed and stored', { 
          eventId: eventData.eventId, 
          relayerId 
        });
      } catch (error) {
        logger.error('Failed to sign event', error, { eventId: eventData.eventId });
      }
    }

    return {
      chain: poller.chain,
      fromBlock: range.fromBlock,
      toBlock: range.toBlock,
      eventsFound: pollResult.eventsFound,
      eventsProcessed: pollResult.eventsProcessed,
      eventsSigned: signedEvents.length,
      signedEvents
    };

  } catch (error) {
    logger.error(`Failed to poll ${poller.chain}`, error);
    throw error;
  }
}
