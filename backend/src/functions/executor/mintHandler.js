/**
 * Mint Handler - Handles minting wrapped tokens on Ethereum
 * Implements Command Pattern for execution
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles Ethereum minting
 * - Open/Closed: Can extend without modification
 * - Dependency Inversion: Depends on service abstractions
 */

const web3Service = require('../../shared/services/web3Service');
const signingService = require('../../shared/services/signingService');
const logger = require('../../shared/utils/logger');
const { Web3Error } = require('../../shared/utils/errors');

class MintHandler {
  constructor() {
    this.chain = 'ethereum';
    this.contractType = 'bridge';
  }

  /**
   * Execute mint operation on Ethereum
   * Implements retry logic with exponential backoff
   */
  async executeMint(eventData) {
    try {
      logger.info('Starting mint execution', { 
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

      // Execute mint transaction
      logger.info('Calling mintWrapped on Ethereum bridge', { to, amount, eventId });
      
      const tx = await web3Service.sendTransaction(
        bridge,
        'mintWrapped',
        [to, amount, eventId],
        {},
        3 // Max retries
      );

      logger.info('Mint transaction sent', { 
        txHash: tx.hash,
        eventId 
      });

      // Wait for confirmation
      const receipt = await web3Service.waitForTransaction(
        tx.hash,
        this.chain,
        3 // Confirmations
      );

      logger.info('Mint transaction confirmed', { 
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
      logger.error('Mint execution failed', error, { 
        eventId: eventData.eventId 
      });
      
      throw new Web3Error('Mint execution failed', {
        eventId: eventData.eventId,
        originalError: error.message
      });
    }
  }

  /**
   * Validate mint parameters
   * Implements Guard Pattern
   */
  validateMintParams(eventData) {
    if (!eventData.toAddress) {
      throw new Web3Error('Missing toAddress for mint');
    }

    if (!eventData.amount || eventData.amount === '0') {
      throw new Web3Error('Invalid amount for mint');
    }

    if (!eventData.eventId) {
      throw new Web3Error('Missing eventId for mint');
    }

    return true;
  }
}

module.exports = new MintHandler();
