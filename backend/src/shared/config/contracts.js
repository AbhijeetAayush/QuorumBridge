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
  ARBITRUM: {
    token: {
      address: process.env.ARBITRUM_SEPOLIA_WRAPPED_TOKEN_ADDRESS || process.env.ARBITRUM_SEPOLIA_TOKEN_ADDRESS || '',
      name: 'BEP20Token',
      abi: [] // Will be populated from deployment
    },
    bridge: {
      address: process.env.ARBITRUM_SEPOLIA_BRIDGE_ADDRESS || '',
      name: 'BSCBridge',
      abi: [] // Will be populated from deployment
    }
  },
  ETHEREUM: {
    wrappedToken: {
      address: process.env.ETHEREUM_SEPOLIA_TOKEN_ADDRESS || '',
      name: 'WrappedToken',
      abi: [] // Will be populated from deployment
    },
    bridge: {
      address: process.env.ETHEREUM_SEPOLIA_BRIDGE_ADDRESS || '',
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
    this.ensureFallbackABIs();
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
        // Load Arbitrum contracts (using existing ABI files)
        if (fs.existsSync(path.join(abiPath, 'BEP20Token.json'))) {
          const bep20 = JSON.parse(fs.readFileSync(path.join(abiPath, 'BEP20Token.json')));
          this.contracts.ARBITRUM.token.abi = bep20.abi;
        }
        
        if (fs.existsSync(path.join(abiPath, 'BSCBridge.json'))) {
          const bscBridge = JSON.parse(fs.readFileSync(path.join(abiPath, 'BSCBridge.json')));
          this.contracts.ARBITRUM.bridge.abi = bscBridge.abi;
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

  /**
   * Ensure minimal ABIs exist for event polling/execution
   * Prevents missing filter/functions when ABI files are not packaged
   */
  ensureFallbackABIs() {
    let fallbackApplied = false;
    const erc20Minimal = [
      {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ];

    const arbitrumBridgeMinimal = [
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'address', name: 'from', type: 'address' },
          { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
          { indexed: true, internalType: 'uint256', name: 'nonce', type: 'uint256' },
          { indexed: true, internalType: 'bytes32', name: 'eventId', type: 'bytes32' },
          { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
        ],
        name: 'TokensLocked',
        type: 'event'
      },
      {
        inputs: [
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'bytes32', name: 'eventId', type: 'bytes32' }
        ],
        name: 'unlockTokens',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ];

    const ethereumBridgeMinimal = [
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'address', name: 'from', type: 'address' },
          { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
          { indexed: true, internalType: 'uint256', name: 'nonce', type: 'uint256' },
          { indexed: true, internalType: 'bytes32', name: 'eventId', type: 'bytes32' },
          { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
        ],
        name: 'TokensBurned',
        type: 'event'
      },
      {
        inputs: [
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'bytes32', name: 'eventId', type: 'bytes32' }
        ],
        name: 'mintWrapped',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ];

    if (!this.contracts.ARBITRUM.token.abi.length) {
      this.contracts.ARBITRUM.token.abi = erc20Minimal;
      fallbackApplied = true;
    }
    if (!this.contracts.ARBITRUM.bridge.abi.length) {
      this.contracts.ARBITRUM.bridge.abi = arbitrumBridgeMinimal;
      fallbackApplied = true;
    }
    if (!this.contracts.ETHEREUM.wrappedToken.abi.length) {
      this.contracts.ETHEREUM.wrappedToken.abi = erc20Minimal;
      fallbackApplied = true;
    }
    if (!this.contracts.ETHEREUM.bridge.abi.length) {
      this.contracts.ETHEREUM.bridge.abi = ethereumBridgeMinimal;
      fallbackApplied = true;
    }

    if (fallbackApplied) {
      console.warn('ContractConfig: using fallback ABIs for missing contracts');
    }
  }

  getArbitrumTokenConfig() {
    return this.contracts.ARBITRUM.token;
  }

  getArbitrumBridgeConfig() {
    return this.contracts.ARBITRUM.bridge;
  }

  getEthereumWrappedTokenConfig() {
    return this.contracts.ETHEREUM.wrappedToken;
  }

  getEthereumBridgeConfig() {
    return this.contracts.ETHEREUM.bridge;
  }

  getAllArbitrumContracts() {
    return this.contracts.ARBITRUM;
  }

  getAllEthereumContracts() {
    return this.contracts.ETHEREUM;
  }

  validateContractAddresses() {
    const required = [
      this.contracts.ARBITRUM.token.address,
      this.contracts.ARBITRUM.bridge.address,
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
