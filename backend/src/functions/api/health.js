/**
 * Health Handler - Health check and system status
 * Implements health check pattern
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles health checks
 * - Open/Closed: Can extend with new health checks
 */

const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const web3Service = require('../../shared/services/web3Service');
const dynamoService = require('../../shared/services/dynamoService');
const logger = require('../../shared/utils/logger');

/**
 * Perform basic health check
 */
async function healthCheck() {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };

    // Check DynamoDB connectivity
    try {
      await dynamoService.docClient.send(new ScanCommand({
        TableName: dynamoService.tableName,
        Limit: 1
      }));
      checks.checks.dynamodb = 'healthy';
    } catch (error) {
      checks.checks.dynamodb = 'unhealthy';
      checks.status = 'degraded';
    }

    // Check Arbitrum RPC connectivity
    try {
      await web3Service.getCurrentBlock('arbitrum');
      checks.checks.arbitrumRpc = 'healthy';
    } catch (error) {
      checks.checks.arbitrumRpc = 'unhealthy';
      checks.status = 'degraded';
    }

    // Check Ethereum RPC connectivity
    try {
      await web3Service.getCurrentBlock('ethereum');
      checks.checks.ethereumRpc = 'healthy';
    } catch (error) {
      checks.checks.ethereumRpc = 'unhealthy';
      checks.status = 'degraded';
    }

    const statusCode = checks.status === 'healthy' ? 200 : 503;

    return {
      statusCode,
      body: checks
    };
  } catch (error) {
    logger.error('Health check failed', error);
    return {
      statusCode: 503,
      body: {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message
      }
    };
  }
}

/**
 * Get detailed system information
 */
async function getSystemInfo() {
  try {
    const [arbitrumBlock, ethBlock] = await Promise.all([
      web3Service.getCurrentBlock('arbitrum').catch(() => null),
      web3Service.getCurrentBlock('ethereum').catch(() => null)
    ]);

    return {
      statusCode: 200,
      body: {
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || '1.0.0',
        chains: {
          arbitrum: {
            chainId: 421614,
            currentBlock: arbitrumBlock,
            status: arbitrumBlock ? 'connected' : 'disconnected'
          },
          ethereum: {
            chainId: 11155111,
            currentBlock: ethBlock,
            status: ethBlock ? 'connected' : 'disconnected'
          }
        },
        environment: {
          region: process.env.AWS_REGION || 'unknown',
          stage: process.env.STAGE || 'dev'
        }
      }
    };
  } catch (error) {
    logger.error('Failed to get system info', error);
    return {
      statusCode: 500,
      body: {
        error: 'Failed to retrieve system information'
      }
    };
  }
}

module.exports = {
  healthCheck,
  getSystemInfo
};
