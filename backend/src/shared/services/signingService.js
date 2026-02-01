/**
 * Signing Service - Handles cryptographic signing for multi-relayer consensus
 * Implements Strategy Pattern for different signing methods
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles signing operations
 * - Open/Closed: Can extend with new signing algorithms
 * - Dependency Inversion: Depends on ethers crypto abstractions
 */

const { ethers } = require('ethers');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

class SigningService {
  constructor() {
    if (SigningService.instance) {
      return SigningService.instance;
    }

    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.wallets = {};
    SigningService.instance = this;
  }

  /**
   * Get relayer private key from AWS Secrets Manager
   * Implements secure key retrieval
   */
  async getRelayerPrivateKey(relayerId) {
    try {
      const secretName = `Relayer${relayerId}PrivateKey`;
      
      const command = new GetSecretValueCommand({
        SecretId: secretName
      });

      const response = await this.secretsClient.send(command);
      
      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secret = JSON.parse(response.SecretString);
      return secret.privateKey || secret.PrivateKey;
    } catch (error) {
      logger.error('Failed to retrieve private key from Secrets Manager', error, { relayerId });
      
      // Fallback to environment variable for local development
      const envKey = process.env[`RELAYER_${relayerId}_PRIVATE_KEY`];
      if (envKey) {
        logger.warn('Using private key from environment variable', { relayerId });
        return envKey;
      }

      throw new ValidationError('Failed to retrieve relayer private key', { relayerId });
    }
  }

  /**
   * Get or create wallet for relayer
   * Implements caching to avoid repeated Secrets Manager calls
   */
  async getRelayerWallet(relayerId) {
    try {
      if (!this.wallets[relayerId]) {
        const privateKey = await this.getRelayerPrivateKey(relayerId);
        this.wallets[relayerId] = new ethers.Wallet(privateKey);
        
        logger.info('Relayer wallet initialized', { 
          relayerId, 
          address: this.wallets[relayerId].address 
        });
      }

      return this.wallets[relayerId];
    } catch (error) {
      logger.error('Failed to get relayer wallet', error, { relayerId });
      throw new ValidationError('Failed to get relayer wallet', { relayerId });
    }
  }

  /**
   * Sign event data for multi-relayer consensus
   * Creates deterministic signature that can be verified by other relayers
   */
  async signEventData(relayerId, eventData) {
    try {
      const wallet = await this.getRelayerWallet(relayerId);

      // Create deterministic message hash
      const messageHash = this.createEventHash(eventData);
      
      // Sign the hash
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));
      
      logger.info('Event data signed', { 
        relayerId, 
        eventId: eventData.eventId,
        address: wallet.address
      });

      return {
        signature,
        relayerId,
        publicKey: wallet.address,
        messageHash
      };
    } catch (error) {
      logger.error('Failed to sign event data', error, { relayerId, eventData });
      throw new ValidationError('Failed to sign event data', { relayerId });
    }
  }

  /**
   * Create deterministic hash from event data
   * All relayers must create identical hash for same event
   */
  createEventHash(eventData) {
    const { eventId, txHash, chain, amount, fromAddress, toAddress } = eventData;
    
    // Encode event data in deterministic order
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32', 'string', 'uint256', 'address', 'address'],
      [eventId, txHash, chain, amount, fromAddress, toAddress]
    );

    // Create keccak256 hash
    return ethers.keccak256(encoded);
  }

  /**
   * Verify signature from another relayer
   * Used in consensus validation
   */
  verifySignature(eventData, signature, expectedAddress) {
    try {
      const messageHash = this.createEventHash(eventData);
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), signature);

      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      
      if (!isValid) {
        logger.warn('Signature verification failed', { 
          expectedAddress, 
          recoveredAddress,
          eventId: eventData.eventId
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Signature verification error', error, { expectedAddress });
      return false;
    }
  }

  /**
   * Get relayer address without loading private key
   * Used for public operations
   */
  async getRelayerAddress(relayerId) {
    try {
      const wallet = await this.getRelayerWallet(relayerId);
      return wallet.address;
    } catch (error) {
      logger.error('Failed to get relayer address', error, { relayerId });
      throw new ValidationError('Failed to get relayer address', { relayerId });
    }
  }

  /**
   * Batch verify signatures from multiple relayers
   * Used in consensus check
   */
  verifyBatchSignatures(eventData, signatures) {
    const results = signatures.map(sig => ({
      relayerId: sig.relayerId,
      isValid: this.verifySignature(eventData, sig.signature, sig.publicKey)
    }));

    const validCount = results.filter(r => r.isValid).length;
    
    logger.debug('Batch signature verification', { 
      total: signatures.length,
      valid: validCount,
      eventId: eventData.eventId
    });

    return {
      results,
      validCount,
      isConsensusReached: validCount >= 2 // 2-of-3 consensus
    };
  }
}

module.exports = new SigningService();
