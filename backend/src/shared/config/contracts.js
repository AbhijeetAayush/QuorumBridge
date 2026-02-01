/**
 * Contract Configuration - Centralized contract settings
 * Follows DRY principle and Repository Pattern
 * 
 * SOLID Principles:
 * - Single Responsibility: Only manages contract configurations
 * - Open/Closed: New contracts can be added without modification
 * - Dependency Inversion: Services depend on this abstraction
 */

// Import ABIs (these will be generated after contract deployment)
// For now, we'll use placeholders that will be replaced with actual ABIs

const CONTRACTS = {
  BSC: {
    token: {
      address: process.env.BSC_TOKEN_ADDRESS || '',
      name: 'BEP20Token',
      abi: [] // Will be populated from deployment
    },
    bridge: {
      address: process.env.BSC_BRIDGE_ADDRESS || '',
      name: 'BSCBridge',
      abi: [] // Will be populated from deployment
    }
  },
  ETHEREUM: {
    wrappedToken: {
      address: process.env.ETH_WRAPPED_TOKEN_ADDRESS || '',
      name: 'WrappedToken',
      abi: [] // Will be populated from deployment
    },
    bridge: {
      address: process.env.ETH_BRIDGE_ADDRESS || '',
      name: 'EthereumBridge',
      abi: [] // Will be populated from deployment
    }
  }
};

/**
 * Contract Configuration Manager
 * Implements Singleton Pattern
 */
class ContractConfig {
  constructor() {
    if (ContractConfig.instance) {
      return ContractConfig.instance;
    }
    this.contracts = CONTRACTS;
    this.loadABIs();
    ContractConfig.instance = this;
  }

  /**
   * Load ABIs from file system or environment
   * In production, ABIs should be stored securely
   */
  loadABIs() {
    try {
      // In a real deployment, load ABIs from S3 or embedded in Lambda layer
      // For now, we'll use a placeholder approach
      const fs = require('fs');
      const path = require('path');
      
      const abiPath = path.join(__dirname, '../../../abis');
      
      if (fs.existsSync(abiPath)) {
        // Load BSC contracts
        if (fs.existsSync(path.join(abiPath, 'BEP20Token.json'))) {
          const bep20 = JSON.parse(fs.readFileSync(path.join(abiPath, 'BEP20Token.json')));
          this.contracts.BSC.token.abi = bep20.abi;
        }
        
        if (fs.existsSync(path.join(abiPath, 'BSCBridge.json'))) {
          const bscBridge = JSON.parse(fs.readFileSync(path.join(abiPath, 'BSCBridge.json')));
          this.contracts.BSC.bridge.abi = bscBridge.abi;
        }
        
        // Load Ethereum contracts
        if (fs.existsSync(path.join(abiPath, 'WrappedToken.json'))) {
          const wrapped = JSON.parse(fs.readFileSync(path.join(abiPath, 'WrappedToken.json')));
          this.contracts.ETHEREUM.wrappedToken.abi = wrapped.abi;
        }
        
        if (fs.existsSync(path.join(abiPath, 'EthereumBridge.json'))) {
          const ethBridge = JSON.parse(fs.readFileSync(path.join(abiPath, 'EthereumBridge.json')));
          this.contracts.ETHEREUM.bridge.abi = ethBridge.abi;
        }
      }
    } catch (error) {
      console.warn('Warning: Could not load ABIs from filesystem. Using environment variables.');
    }
  }

  getBSCTokenConfig() {
    return this.contracts.BSC.token;
  }

  getBSCBridgeConfig() {
    return this.contracts.BSC.bridge;
  }

  getEthereumWrappedTokenConfig() {
    return this.contracts.ETHEREUM.wrappedToken;
  }

  getEthereumBridgeConfig() {
    return this.contracts.ETHEREUM.bridge;
  }

  getAllBSCContracts() {
    return this.contracts.BSC;
  }

  getAllEthereumContracts() {
    return this.contracts.ETHEREUM;
  }

  validateContractAddresses() {
    const required = [
      this.contracts.BSC.token.address,
      this.contracts.BSC.bridge.address,
      this.contracts.ETHEREUM.wrappedToken.address,
      this.contracts.ETHEREUM.bridge.address
    ];

    const missing = required.filter(addr => !addr || addr === '');
    
    if (missing.length > 0) {
      throw new Error('Missing contract addresses. Please set environment variables.');
    }

    return true;
  }
}

module.exports = new ContractConfig();
