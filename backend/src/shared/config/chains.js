/**
 * Chain Configuration - Centralized chain settings
 * Follows DRY principle and Strategy Pattern
 * 
 * SOLID Principles:
 * - Single Responsibility: Only manages chain configurations
 * - Open/Closed: New chains can be added without modifying existing
 * - Dependency Inversion: Lambda functions depend on this abstraction
 */

const CHAINS = {
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || '',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    blockTime: 250, // 0.25 seconds
    confirmations: 3,
    explorerUrl: 'https://sepolia.arbiscan.io'
  },
  ETHEREUM_SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL || '',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    blockTime: 12000, // 12 seconds
    confirmations: 3,
    explorerUrl: 'https://sepolia.etherscan.io'
  }
};

/**
 * Chain Configuration Manager
 * Implements Singleton Pattern
 */
class ChainConfig {
  constructor() {
    if (ChainConfig.instance) {
      return ChainConfig.instance;
    }
    this.chains = CHAINS;
    ChainConfig.instance = this;
  }

  getChainConfig(chainId) {
    const chain = Object.values(this.chains).find(c => c.chainId === chainId);
    if (!chain) {
      throw new Error(`Chain configuration not found for chainId: ${chainId}`);
    }
    return chain;
  }

  getChainByName(name) {
    const chain = this.chains[name];
    if (!chain) {
      throw new Error(`Chain configuration not found for name: ${name}`);
    }
    return chain;
  }

  getArbitrumConfig() {
    return this.chains.ARBITRUM_SEPOLIA;
  }

  getEthereumConfig() {
    return this.chains.ETHEREUM_SEPOLIA;
  }

  getAllChains() {
    return Object.values(this.chains);
  }

  isValidChainId(chainId) {
    return Object.values(this.chains).some(c => c.chainId === chainId);
  }
}

module.exports = new ChainConfig();
