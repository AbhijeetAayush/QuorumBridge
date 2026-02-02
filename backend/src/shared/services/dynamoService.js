/**
 * DynamoDB Service - Single Table Design Implementation
 * Implements Repository Pattern and follows SOLID principles
 * 
 * Design Patterns:
 * - Repository Pattern: Abstracts data access
 * - Singleton Pattern: Single DynamoDB client instance
 * - Factory Pattern: Creates different entity types
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles DynamoDB operations
 * - Open/Closed: Can extend with new entity types
 * - Dependency Inversion: Lambda functions depend on this abstraction
 * 
 * Single Table Design:
 * PK: EVENT#{eventId}
 * SK: METADATA | SIGNATURE#{relayerId} | EXECUTION
 * GSI1: CHAIN#{chain} / STATUS#{status}#{timestamp}
 * GSI2: EVENT#{eventId} / SIGNATURE#{relayerId}
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const logger = require('../utils/logger');
const { DynamoDBError } = require('../utils/errors');

class DynamoDBService {
  constructor() {
    if (DynamoDBService.instance) {
      return DynamoDBService.instance;
    }

    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
      }
    });

    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'BridgeTable';
    DynamoDBService.instance = this;
  }

  /**
   * Create Event Entity (PK=EVENT#{eventId}, SK=METADATA)
   * Implements Factory Pattern
   */
  async createEvent(eventData) {
    try {
      const { eventId, txHash, chain, amount, fromAddress, toAddress, status } = eventData;
      
      const item = {
        PK: `EVENT#${eventId}`,
        SK: 'METADATA',
        GSI1PK: `CHAIN#${chain}`,
        GSI1SK: `STATUS#${status}#${Date.now()}`,
        eventId,
        txHash,
        chain,
        amount,
        fromAddress,
        toAddress,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entityType: 'EVENT'
      };

      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      logger.info('Event created in DynamoDB', { eventId, chain, status });
      return item;
    } catch (error) {
      logger.error('Failed to create event', error, { eventData });
      throw new DynamoDBError('Failed to create event', { originalError: error.message });
    }
  }

  /**
   * Create Signature Entity (PK=EVENT#{eventId}, SK=SIGNATURE#{relayerId})
   * Implements Factory Pattern
   */
  async createSignature(signatureData) {
    try {
      const { eventId, relayerId, signature, publicKey } = signatureData;
      
      const item = {
        PK: `EVENT#${eventId}`,
        SK: `SIGNATURE#${relayerId}`,
        GSI2PK: `EVENT#${eventId}`,
        GSI2SK: `SIGNATURE#${relayerId}`,
        eventId,
        relayerId,
        signature,
        publicKey,
        timestamp: new Date().toISOString(),
        entityType: 'SIGNATURE'
      };

      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
      }));

      logger.info('Signature created in DynamoDB', { eventId, relayerId });
      return item;
    } catch (error) {
      logger.error('Failed to create signature', error, { signatureData });
      throw new DynamoDBError('Failed to create signature', { originalError: error.message });
    }
  }

  /**
   * Create or Update Execution Entity (PK=EVENT#{eventId}, SK=EXECUTION)
   * Implements Factory Pattern
   */
  async upsertExecution(executionData) {
    try {
      const { eventId, status, txHash, retryCount = 0, error = null } = executionData;
      
      const item = {
        PK: `EVENT#${eventId}`,
        SK: 'EXECUTION',
        eventId,
        status,
        txHash,
        retryCount,
        error,
        updatedAt: new Date().toISOString(),
        entityType: 'EXECUTION'
      };

      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));

      logger.info('Execution updated in DynamoDB', { eventId, status });
      return item;
    } catch (error) {
      logger.error('Failed to upsert execution', error, { executionData });
      throw new DynamoDBError('Failed to upsert execution', { originalError: error.message });
    }
  }

  /**
   * Get Event with all related data (event + signatures + execution)
   * Single query retrieves all data for an event
   */
  async getEventData(eventId) {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${eventId}`
        }
      }));

      if (!result.Items || result.Items.length === 0) {
        // Fallback: find event by eventId if PK format mismatched
        const fallbackEvent = await this.findEventMetadataByEventId(eventId);
        if (!fallbackEvent) {
          return null;
        }
        const fallbackResult = await this.docClient.send(new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': fallbackEvent.PK
          }
        }));
        if (!fallbackResult.Items || fallbackResult.Items.length === 0) {
          return null;
        }
        return this.buildEventDataFromItems(fallbackResult.Items);
      }

      const eventData = this.buildEventDataFromItems(result.Items);
      logger.debug('Retrieved event data', { eventId, signatureCount: eventData.signatures.length });
      return eventData;
    } catch (error) {
      logger.error('Failed to get event data', error, { eventId });
      throw new DynamoDBError('Failed to get event data', { originalError: error.message });
    }
  }

  buildEventDataFromItems(items) {
    const eventData = {
      event: null,
      signatures: [],
      execution: null
    };

    items.forEach(item => {
      if (item.SK === 'METADATA') {
        eventData.event = item;
      } else if (item.SK.startsWith('SIGNATURE#')) {
        eventData.signatures.push(item);
      } else if (item.SK === 'EXECUTION') {
        eventData.execution = item;
      }
    });

    return eventData;
  }

  async findEventMetadataByEventId(eventId) {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'eventId = :eventId AND SK = :sk',
        ExpressionAttributeValues: {
          ':eventId': eventId,
          ':sk': 'METADATA'
        },
        Limit: 1
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return result.Items[0];
    } catch (error) {
      logger.error('Failed to scan event metadata', error, { eventId });
      return null;
    }
  }

  /**
   * Get signatures for an event
   * Uses single query to get all signatures
   */
  async getSignatures(eventId) {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${eventId}`,
          ':sk': 'SIGNATURE#'
        }
      }));

      logger.debug('Retrieved signatures', { eventId, count: result.Items?.length || 0 });
      return result.Items || [];
    } catch (error) {
      logger.error('Failed to get signatures', error, { eventId });
      throw new DynamoDBError('Failed to get signatures', { originalError: error.message });
    }
  }

  /**
   * Query events by chain and status
   * Uses GSI1 for efficient querying
   */
  async getEventsByChainAndStatus(chain, status, limit = 50) {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `CHAIN#${chain}`,
          ':sk': `STATUS#${status}`
        },
        Limit: limit,
        ScanIndexForward: false // Most recent first
      }));

      logger.debug('Queried events by chain and status', { chain, status, count: result.Items?.length || 0 });
      return result.Items || [];
    } catch (error) {
      logger.error('Failed to query events', error, { chain, status });
      throw new DynamoDBError('Failed to query events', { originalError: error.message });
    }
  }

  /**
   * Update event status
   * Maintains GSI1 consistency
   */
  async updateEventStatus(eventId, newStatus, chain) {
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET #status = :status, GSI1SK = :gsi1sk, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':gsi1sk': `STATUS#${newStatus}#${Date.now()}`,
          ':updatedAt': new Date().toISOString()
        }
      }));

      logger.info('Event status updated', { eventId, newStatus });
    } catch (error) {
      logger.error('Failed to update event status', error, { eventId, newStatus });
      throw new DynamoDBError('Failed to update event status', { originalError: error.message });
    }
  }

  /**
   * Check if event is already processed
   * Prevents double processing
   */
  async isEventProcessed(eventId) {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: 'METADATA'
        }
      }));

      return result.Item !== undefined;
    } catch (error) {
      logger.error('Failed to check event status', error, { eventId });
      throw new DynamoDBError('Failed to check event status', { originalError: error.message });
    }
  }
}

module.exports = new DynamoDBService();
