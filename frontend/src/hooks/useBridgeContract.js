/**
 * useBridgeContract Hook - Manages bridge contract interactions
 * Implements Facade Pattern for contract operations
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles bridge contract logic
 * - Open/Closed: Can extend with new bridge operations
 * - Dependency Inversion: Depends on useWeb3 abstraction
 */

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from './useWeb3.jsx';

// Contract addresses (should come from environment variables)
const CONTRACTS = {
  ETHEREUM: {
    token: import.meta.env.VITE_BSC_TOKEN_ADDRESS || '',
    bridge: import.meta.env.VITE_BSC_BRIDGE_ADDRESS || ''
  },
  ARBITRUM: {
    wrappedToken: import.meta.env.VITE_ETH_WRAPPED_TOKEN_ADDRESS || '',
    bridge: import.meta.env.VITE_ETH_BRIDGE_ADDRESS || ''
  }
};

// Minimal ABIs - only functions we need
const TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const BSC_BRIDGE_ABI = [
  'function lockTokens(uint256 amount) returns (bytes32)',
  'event TokensLocked(address indexed from, uint256 amount, uint256 indexed nonce, bytes32 indexed eventId, uint256 timestamp)'
];

const ETH_BRIDGE_ABI = [
  'function burnWrapped(uint256 amount) returns (bytes32)',
  'event TokensBurned(address indexed from, uint256 amount, uint256 indexed nonce, bytes32 indexed eventId, uint256 timestamp)'
];

export function useBridgeContract() {
  const { account, signer, chainId, isOnChain } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get token balance
   * DRY principle - reusable balance check
   */
  const getBalance = useCallback(async (chain) => {
    try {
      if (!signer) throw new Error('Wallet not connected');

      const tokenAddress = chain === 'ETHEREUM' 
        ? CONTRACTS.ETHEREUM.token 
        : CONTRACTS.ARBITRUM.wrappedToken;

      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
      const balance = await tokenContract.balanceOf(account);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Balance fetch error:', err);
      throw err;
    }
  }, [signer, account]);

  /**
   * Approve bridge to spend tokens
   * Implements Guard Pattern
   */
  const approveToken = useCallback(async (amount, chain) => {
    try {
      if (!signer) throw new Error('Wallet not connected');

      const tokenAddress = chain === 'ETHEREUM' 
        ? CONTRACTS.ETHEREUM.token 
        : CONTRACTS.ARBITRUM.wrappedToken;
      
      const bridgeAddress = chain === 'ETHEREUM'
        ? CONTRACTS.ETHEREUM.bridge
        : CONTRACTS.ARBITRUM.bridge;

      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
      const amountWei = ethers.parseEther(amount.toString());
      
      const tx = await tokenContract.approve(bridgeAddress, amountWei);
      await tx.wait();
      
      return tx.hash;
    } catch (err) {
      console.error('Approval error:', err);
      throw err;
    }
  }, [signer]);

  /**
   * Check allowance
   * Implements validation pattern
   */
  const checkAllowance = useCallback(async (amount, chain) => {
    try {
      if (!signer) throw new Error('Wallet not connected');

      const tokenAddress = chain === 'ETHEREUM' 
        ? CONTRACTS.ETHEREUM.token 
        : CONTRACTS.ARBITRUM.wrappedToken;
      
      const bridgeAddress = chain === 'ETHEREUM'
        ? CONTRACTS.ETHEREUM.bridge
        : CONTRACTS.ARBITRUM.bridge;

      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
      const allowance = await tokenContract.allowance(account, bridgeAddress);
      const amountWei = ethers.parseEther(amount.toString());
      
      return allowance >= amountWei;
    } catch (err) {
      console.error('Allowance check error:', err);
      return false;
    }
  }, [signer, account]);

  /**
   * Lock tokens on Ethereum Sepolia (bridge to Arbitrum)
   * Implements Command Pattern
   */
  const lockTokens = useCallback(async (amount) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isOnChain('ETHEREUM_SEPOLIA')) {
        throw new Error('Please switch to Ethereum Sepolia');
      }

      // Check and approve if necessary
      const hasAllowance = await checkAllowance(amount, 'ETHEREUM');
      if (!hasAllowance) {
        await approveToken(amount, 'ETHEREUM');
      }

      // Lock tokens
      const bridgeContract = new ethers.Contract(
        CONTRACTS.ETHEREUM.bridge,
        BSC_BRIDGE_ABI,
        signer
      );

      const amountWei = ethers.parseEther(amount.toString());
      const tx = await bridgeContract.lockTokens(amountWei);
      const receipt = await tx.wait();

      // Extract eventId from logs
      const event = receipt.logs.find(log => {
        try {
          const parsedLog = bridgeContract.interface.parseLog(log);
          return parsedLog.name === 'TokensLocked';
        } catch {
          return false;
        }
      });

      let eventId = null;
      if (event) {
        const parsedLog = bridgeContract.interface.parseLog(event);
        eventId = parsedLog.args.eventId;
      }

      return {
        txHash: receipt.hash,
        eventId
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, isOnChain, checkAllowance, approveToken]);

  /**
   * Burn wrapped tokens on Arbitrum Sepolia (bridge to Ethereum)
   * Implements Command Pattern
   */
  const burnTokens = useCallback(async (amount) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isOnChain('ARBITRUM_SEPOLIA')) {
        throw new Error('Please switch to Arbitrum Sepolia');
      }

      // Check and approve if necessary
      const hasAllowance = await checkAllowance(amount, 'ARBITRUM');
      if (!hasAllowance) {
        await approveToken(amount, 'ARBITRUM');
      }

      // Burn tokens
      const bridgeContract = new ethers.Contract(
        CONTRACTS.ARBITRUM.bridge,
        ETH_BRIDGE_ABI,
        signer
      );

      const amountWei = ethers.parseEther(amount.toString());
      const tx = await bridgeContract.burnWrapped(amountWei);
      const receipt = await tx.wait();

      // Extract eventId from logs
      const event = receipt.logs.find(log => {
        try {
          const parsedLog = bridgeContract.interface.parseLog(log);
          return parsedLog.name === 'TokensBurned';
        } catch {
          return false;
        }
      });

      let eventId = null;
      if (event) {
        const parsedLog = bridgeContract.interface.parseLog(event);
        eventId = parsedLog.args.eventId;
      }

      return {
        txHash: receipt.hash,
        eventId
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, isOnChain, checkAllowance, approveToken]);

  return {
    getBalance,
    lockTokens,
    burnTokens,
    approveToken,
    checkAllowance,
    isLoading,
    error,
    contracts: CONTRACTS
  };
}
