/**
 * BSC Event Poller - Polls BSC chain for TokensLocked events
 * Implements Observer Pattern for event detection
 * 
 * SOLID Principles:
 * - Single Responsibility: Only polls BSC events
 * - Open/Closed: Can extend for new event types
 * - Dependency Inversion: Depends on service abstractions
 */

const web3Service = require('../../shared/services/web3Service');
const dynamoService = require('../../shared/services/dynamoService');
const logger = require('../../shared/utils/logger');
const { EventProcessingError } = require('../../shared/utils/errors');

class BSCPoller {
  constructor() {
    this.chain = 'bsc';
    this.contractType = 'bridge';
    this.eventName = 'TokensLocked';
    this.lastProcessedBlock = null;
  }

  /**
   * Poll for TokensLocked events
   * Implements polling strategy with block range management
   */
  async poll(fromBlock, toBlock) {
    try {
      logger.info('Starting BSC event poll', { fromBlock, toBlock });

      const events = await web3Service.queryEvents(
        this.chain,
        this.contractType,
        this.eventName,
        {},
        fromBlock,
        toBlock
      );

      logger.info(`Found ${events.length} TokensLocked events`, { fromBlock, toBlock });

      const processedEvents = [];
      for (const event of events) {
        try {
          const processed = await this.processEvent(event);
          if (processed) {
            processedEvents.push(processed);
          }
        } catch (error) {
          logger.error('Failed to process individual event', error, {
            txHash: event.transactionHash
          });
          // Continue processing other events
        }
      }

      return {
        success: true,
        eventsFound: events.length,
        eventsProcessed: processedEvents.length,
        events: processedEvents
      };
    } catch (error) {
      logger.error('BSC polling failed', error, { fromBlock, toBlock });
      throw new EventProcessingError('BSC polling failed', { 
        fromBlock, 
        toBlock,
        originalError: error.message 
      });
    }
  }

  /**
   * Process individual TokensLocked event
   * Implements Command Pattern
   */
  async processEvent(event) {
    try {
      const parsedEvent = web3Service.parseEventLog(event);
      
      // Extract event data
      const eventData = {
        eventId: parsedEvent.args.eventId,
        txHash: parsedEvent.transactionHash,
        chain: 'BSC',
        amount: parsedEvent.args.amount.toString(),
        fromAddress: parsedEvent.args.from,
        toAddress: parsedEvent.args.from, // Same address on destination
        status: 'PENDING_MINT',
        blockNumber: parsedEvent.blockNumber,
        nonce: parsedEvent.args.nonce.toString(),
        timestamp: parsedEvent.args.timestamp.toString()
      };

      // Check if already processed
      const exists = await dynamoService.isEventProcessed(eventData.eventId);
      if (exists) {
        logger.debug('Event already processed, skipping', { eventId: eventData.eventId });
        return null;
      }

      // Create event in DynamoDB
      await dynamoService.createEvent(eventData);

      logger.info('BSC event processed and stored', { 
        eventId: eventData.eventId,
        txHash: eventData.txHash,
        amount: eventData.amount
      });

      return eventData;
    } catch (error) {
      logger.error('Failed to process BSC event', error);
      throw new EventProcessingError('Failed to process BSC event', { 
        transactionHash: event.transactionHash 
      });
    }
  }

  /**
   * Get safe block range for polling
   * Prevents missed events and handles reorgs
   */
  async getPollingRange(maxBlocksPerPoll = 1000) {
    try {
      const currentBlock = await web3Service.getCurrentBlock(this.chain);
      
      // Start from last processed + 1, or current - 100 for safety
      let fromBlock = this.lastProcessedBlock 
        ? this.lastProcessedBlock + 1 
        : currentBlock - 100;

      // Don't poll too far ahead (leave buffer for confirmations)
      const safeBlock = currentBlock - 3; // 3 block confirmation
      let toBlock = Math.min(fromBlock + maxBlocksPerPoll, safeBlock);

      // Ensure valid range
      if (fromBlock > toBlock) {
        logger.debug('No new blocks to poll', { fromBlock, toBlock, currentBlock });
        return null;
      }

      this.lastProcessedBlock = toBlock;

      return { fromBlock, toBlock, currentBlock };
    } catch (error) {
      logger.error('Failed to get polling range', error);
      throw new EventProcessingError('Failed to get polling range');
    }
  }
}

module.exports = new BSCPoller();
