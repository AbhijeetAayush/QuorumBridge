/**
 * Unlock Handler - Handles unlocking tokens on Arbitrum
 * Implements Command Pattern for execution
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles Arbitrum unlocking
 * - Open/Closed: Can extend without modification
 * - Dependency Inversion: Depends on service abstractions
 */

const web3Service = require('../../shared/services/web3Service');
const signingService = require('../../shared/services/signingService');
const logger = require('../../shared/utils/logger');
const { Web3Error } = require('../../shared/utils/errors');

class UnlockHandler {
  constructor() {
    this.chain = 'arbitrum';
    this.contractType = 'bridge';
  }

  /**
   * Execute unlock operation on Arbitrum
   * Implements retry logic with exponential backoff
   */
  async executeUnlock(eventData) {
    try {
      logger.info('Starting unlock execution', { 
        eventId: eventData.eventId,
        amount: eventData.amount,
        to: eventData.toAddress
      });

      // Get relayer wallet (uses Relayer 1 for execution)
      const relayerId = process.env.EXECUTOR_RELAYER_ID || '1';
      const wallet = await signingService.getRelayerWallet(relayerId);
      
      // Connect wallet to provider
      const provider = web3Service.getProvider(this.chain);
      const signer = wallet.connect(provider);

      // Get bridge contract with signer
      const bridge = web3Service.getContract(this.chain, this.contractType, signer);

      // Prepare parameters
      const to = eventData.toAddress;
      const amount = eventData.amount;
      const eventId = eventData.eventId;

      // Execute unlock transaction
      logger.info('Calling unlockTokens on Arbitrum bridge', { to, amount, eventId });
      
      const tx = await web3Service.sendTransaction(
        bridge,
        'unlockTokens',
        [to, amount, eventId],
        {},
        3 // Max retries
      );

      logger.info('Unlock transaction sent', { 
        txHash: tx.hash,
        eventId 
      });

      // Wait for confirmation
      const receipt = await web3Service.waitForTransaction(
        tx.hash,
        this.chain,
        3 // Confirmations
      );

      logger.info('Unlock transaction confirmed', { 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        eventId
      });

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Unlock execution failed', error, { 
        eventId: eventData.eventId 
      });
      
      throw new Web3Error('Unlock execution failed', {
        eventId: eventData.eventId,
        originalError: error.message
      });
    }
  }

  /**
   * Validate unlock parameters
   * Implements Guard Pattern
   */
  validateUnlockParams(eventData) {
    if (!eventData.toAddress) {
      throw new Web3Error('Missing toAddress for unlock');
    }

    if (!eventData.amount || eventData.amount === '0') {
      throw new Web3Error('Invalid amount for unlock');
    }

    if (!eventData.eventId) {
      throw new Web3Error('Missing eventId for unlock');
    }

    return true;
  }
}

module.exports = new UnlockHandler();
