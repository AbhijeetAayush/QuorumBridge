/**
 * API Lambda Handler
 * Handles API Gateway requests for status and health endpoints
 * 
 * Design Patterns:
 * - Router Pattern: Routes requests to appropriate handlers
 * - Facade Pattern: Provides unified API interface
 * 
 * SOLID Principles:
 * - Single Responsibility: Routes API requests
 * - Open/Closed: New routes can be added
 * - Dependency Inversion: Depends on handler abstractions
 */

const statusHandler = require('./status');
const healthHandler = require('./health');
const logger = require('../../shared/utils/logger');

/**
 * Lambda handler function
 * @param {Object} event - API Gateway event
 */
exports.handler = async (event) => {
  logger.info('API Lambda invoked', { 
    path: event.path,
    method: event.httpMethod,
    queryParams: event.queryStringParameters
  });

  try {
    const path = event.path || event.rawPath;
    const method = event.httpMethod || event.requestContext?.http?.method;
    const queryParams = event.queryStringParameters || {};

    let response;

    // Route requests
    if (path === '/health' && method === 'GET') {
      response = await healthHandler.healthCheck();
    }
    else if (path === '/system-info' && method === 'GET') {
      response = await healthHandler.getSystemInfo();
    }
    else if (path === '/status' && method === 'GET') {
      const eventId = queryParams.eventId;
      if (eventId) {
        response = await statusHandler.getEventStatus(eventId);
      } else {
        const chain = queryParams.chain || 'BSC';
        const status = queryParams.status || 'PENDING_MINT';
        const limit = parseInt(queryParams.limit) || 20;
        response = await statusHandler.getRecentEvents(chain, status, limit);
      }
    }
    else if (path === '/stats' && method === 'GET') {
      response = await statusHandler.getBridgeStats();
    }
    else {
      response = {
        statusCode: 404,
        body: {
          error: 'Not found',
          path,
          availableEndpoints: [
            'GET /health',
            'GET /system-info',
            'GET /status?eventId={id}',
            'GET /status?chain={BSC|ETHEREUM}&status={status}&limit={limit}',
            'GET /stats'
          ]
        }
      };
    }

    // Format response for API Gateway
    return formatResponse(response);

  } catch (error) {
    logger.error('API Lambda failed', error);
    return formatResponse({
      statusCode: 500,
      body: {
        error: 'Internal server error',
        message: error.message
      }
    });
  }
};

/**
 * Format response for API Gateway
 * Adds CORS headers and stringifies body
 */
function formatResponse(response) {
  return {
    statusCode: response.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    },
    body: JSON.stringify(response.body)
  };
}
