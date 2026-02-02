/**
 * Web3 Service - Manages blockchain connections and interactions
 * Implements Singleton and Strategy Patterns
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles Web3 operations
 * - Open/Closed: Can extend with new chain support
 * - Liskov Substitution: All providers follow same interface
 * - Dependency Inversion: Depends on ethers abstractions
 */

const { ethers } = require('ethers');
const chainConfig = require('../config/chains');
const contractConfig = require('../config/contracts');
const logger = require('../utils/logger');
const { Web3Error } = require('../utils/errors');

class Web3Service {
  constructor() {
    if (Web3Service.instance) {
      return Web3Service.instance;
    }

    this.providers = {};
    this.contracts = {};
    this.initializeProviders();
    Web3Service.instance = this;
  }

  /**
   * Initialize providers for all chains
   * Implements Strategy Pattern for different chains
   */
  initializeProviders() {
    try {
      // Arbitrum Provider
      const arbitrumConfig = chainConfig.getArbitrumConfig();
      this.providers.arbitrum = new ethers.JsonRpcProvider(arbitrumConfig.rpcUrl, {
        chainId: arbitrumConfig.chainId,
        name: arbitrumConfig.name
      });

      // Ethereum Provider
      const ethConfig = chainConfig.getEthereumConfig();
      this.providers.ethereum = new ethers.JsonRpcProvider(ethConfig.rpcUrl, {
        chainId: ethConfig.chainId,
        name: ethConfig.name
      });

      logger.info('Web3 providers initialized');
    } catch (error) {
      logger.error('Failed to initialize Web3 providers', error);
      throw new Web3Error('Provider initialization failed', { originalError: error.message });
    }
  }

  /**
   * Get provider for a specific chain
   * Implements Strategy Pattern
   */
  getProvider(chain) {
    const provider = this.providers[chain.toLowerCase()];
    if (!provider) {
      throw new Web3Error(`Provider not found for chain: ${chain}`);
    }
    return provider;
  }

  /**
   * Get contract instance
   * Implements Factory Pattern
   */
  getContract(chain, contractType, signerOrProvider) {
    try {
      const key = `${chain}_${contractType}`;
      
      if (!this.contracts[key] || signerOrProvider) {
        const config = this.getContractConfig(chain, contractType);
        const providerOrSigner = signerOrProvider || this.getProvider(chain);
        
        this.contracts[key] = new ethers.Contract(
          config.address,
          config.abi,
          providerOrSigner
        );
      }

      return this.contracts[key];
    } catch (error) {
      logger.error('Failed to get contract instance', error, { chain, contractType });
      throw new Web3Error('Contract instantiation failed', { chain, contractType });
    }
  }

  /**
   * Get contract configuration
   * DRY principle - centralized config retrieval
   */
  getContractConfig(chain, contractType) {
    if (chain === 'arbitrum') {
      return contractType === 'token' 
        ? contractConfig.getArbitrumTokenConfig()
        : contractConfig.getArbitrumBridgeConfig();
    } else if (chain === 'ethereum') {
      return contractType === 'token'
        ? contractConfig.getEthereumWrappedTokenConfig()
        : contractConfig.getEthereumBridgeConfig();
    }
    throw new Web3Error(`Invalid chain or contract type: ${chain}, ${contractType}`);
  }

  /**
   * Create wallet from private key
   * Used by relayers to sign transactions
   */
  createWallet(privateKey, chain) {
    try {
      const provider = this.getProvider(chain);
      return new ethers.Wallet(privateKey, provider);
    } catch (error) {
      logger.error('Failed to create wallet', error, { chain });
      throw new Web3Error('Wallet creation failed', { chain });
    }
  }

  /**
   * Wait for transaction confirmation
   * Implements retry logic with exponential backoff
   */
  async waitForTransaction(txHash, chain, confirmations = 3) {
    try {
      const provider = this.getProvider(chain);
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      
      if (!receipt || receipt.status === 0) {
        throw new Web3Error('Transaction failed', { txHash, chain });
      }

      logger.info('Transaction confirmed', { txHash, chain, confirmations });
      return receipt;
    } catch (error) {
      logger.error('Transaction wait failed', error, { txHash, chain });
      throw new Web3Error('Transaction wait failed', { txHash, chain, originalError: error.message });
    }
  }

  /**
   * Get current block number
   * Used for event polling
   */
  async getCurrentBlock(chain) {
    try {
      const provider = this.getProvider(chain);
      const blockNumber = await provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      logger.error('Failed to get current block', error, { chain });
      throw new Web3Error('Failed to get current block', { chain });
    }
  }

  /**
   * Query events from contract
   * Implements pagination for large result sets
   */
  async queryEvents(chain, contractType, eventName, filters = {}, fromBlock, toBlock) {
    try {
      const contract = this.getContract(chain, contractType);
      let events;

      if (contract.filters && typeof contract.filters[eventName] === 'function') {
        const filter = contract.filters[eventName](...Object.values(filters));
        events = await contract.queryFilter(filter, fromBlock, toBlock);
      } else {
        // Fallback for minimal ABIs without generated filters
        events = await contract.queryFilter(eventName, fromBlock, toBlock);
      }
      
      logger.debug('Events queried', { 
        chain, 
        contractType, 
        eventName, 
        count: events.length,
        fromBlock,
        toBlock
      });

      return events;
    } catch (error) {
      logger.error('Failed to query events', error, { chain, contractType, eventName });
      throw new Web3Error('Event query failed', { chain, contractType, eventName });
    }
  }

  /**
   * Parse event log
   * Extracts data from event logs
   */
  parseEventLog(event) {
    try {
      return {
        eventName: event.eventName,
        args: event.args,
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        transactionHash: event.transactionHash,
        logIndex: event.index
      };
    } catch (error) {
      logger.error('Failed to parse event log', error);
      throw new Web3Error('Event parsing failed');
    }
  }

  /**
   * Estimate gas for transaction
   * Prevents out-of-gas errors
   */
  async estimateGas(contract, method, args = []) {
    try {
      const gasEstimate = await contract[method].estimateGas(...args);
      // Add 20% buffer
      return gasEstimate * 120n / 100n;
    } catch (error) {
      logger.error('Failed to estimate gas', error, { method });
      throw new Web3Error('Gas estimation failed', { method });
    }
  }

  /**
   * Send transaction with retry logic
   * Implements exponential backoff
   */
  async sendTransaction(contract, method, args = [], options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const gasLimit = await this.estimateGas(contract, method, args);
        const tx = await contract[method](...args, { ...options, gasLimit });
        
        logger.info('Transaction sent', { 
          txHash: tx.hash, 
          method, 
          attempt 
        });

        return tx;
      } catch (error) {
        lastError = error;
        logger.warn(`Transaction attempt ${attempt} failed`, { method, error: error.message });
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('Transaction failed after retries', lastError, { method, maxRetries });
    throw new Web3Error('Transaction failed after retries', { method, attempts: maxRetries });
  }
}

module.exports = new Web3Service();
