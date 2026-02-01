/**
 * Status Handler - Returns bridge status and event information
 * Implements Repository Pattern for data access
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles status queries
 * - Open/Closed: Can extend with new status endpoints
 * - Dependency Inversion: Depends on service abstractions
 */

const dynamoService = require('../../shared/services/dynamoService');
const logger = require('../../shared/utils/logger');

/**
 * Get status for a specific event
 */
async function getEventStatus(eventId) {
  try {
    const eventData = await dynamoService.getEventData(eventId);
    
    if (!eventData || !eventData.event) {
      return {
        statusCode: 404,
        body: {
          error: 'Event not found',
          eventId
        }
      };
    }

    return {
      statusCode: 200,
      body: {
        event: {
          eventId: eventData.event.eventId,
          txHash: eventData.event.txHash,
          chain: eventData.event.chain,
          amount: eventData.event.amount,
          fromAddress: eventData.event.fromAddress,
          toAddress: eventData.event.toAddress,
          status: eventData.event.status,
          createdAt: eventData.event.createdAt,
          updatedAt: eventData.event.updatedAt
        },
        signatures: eventData.signatures.map(sig => ({
          relayerId: sig.relayerId,
          timestamp: sig.timestamp
        })),
        signatureCount: eventData.signatures.length,
        execution: eventData.execution ? {
          status: eventData.execution.status,
          txHash: eventData.execution.txHash,
          updatedAt: eventData.execution.updatedAt
        } : null
      }
    };
  } catch (error) {
    logger.error('Failed to get event status', error, { eventId });
    return {
      statusCode: 500,
      body: {
        error: 'Failed to retrieve event status'
      }
    };
  }
}

/**
 * Get recent events by chain and status
 */
async function getRecentEvents(chain, status = 'PENDING_MINT', limit = 20) {
  try {
    const events = await dynamoService.getEventsByChainAndStatus(
      chain.toUpperCase(),
      status,
      Math.min(limit, 100) // Max 100 events
    );

    return {
      statusCode: 200,
      body: {
        chain,
        status,
        count: events.length,
        events: events.map(event => ({
          eventId: event.eventId,
          txHash: event.txHash,
          amount: event.amount,
          fromAddress: event.fromAddress,
          status: event.status,
          createdAt: event.createdAt
        }))
      }
    };
  } catch (error) {
    logger.error('Failed to get recent events', error, { chain, status });
    return {
      statusCode: 500,
      body: {
        error: 'Failed to retrieve recent events'
      }
    };
  }
}

/**
 * Get overall bridge statistics
 */
async function getBridgeStats() {
  try {
    // Get events from both chains
    const [bscPending, ethPending] = await Promise.all([
      dynamoService.getEventsByChainAndStatus('BSC', 'PENDING_MINT', 10),
      dynamoService.getEventsByChainAndStatus('ETHEREUM', 'PENDING_UNLOCK', 10)
    ]);

    return {
      statusCode: 200,
      body: {
        timestamp: new Date().toISOString(),
        bsc: {
          pendingEvents: bscPending.length
        },
        ethereum: {
          pendingEvents: ethPending.length
        },
        totalPending: bscPending.length + ethPending.length
      }
    };
  } catch (error) {
    logger.error('Failed to get bridge stats', error);
    return {
      statusCode: 500,
      body: {
        error: 'Failed to retrieve bridge statistics'
      }
    };
  }
}

module.exports = {
  getEventStatus,
  getRecentEvents,
  getBridgeStats
};
