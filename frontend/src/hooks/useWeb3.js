/**
 * useWeb3 Hook - Manages Web3 wallet connection
 * Implements Singleton Pattern for provider/signer
 * 
 * SOLID Principles:
 * - Single Responsibility: Only manages Web3 connection
 * - Open/Closed: Can extend with new wallet providers
 * - Dependency Inversion: Components depend on this hook abstraction
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const CHAINS = {
  BSC_TESTNET: {
    chainId: '0x61', // 97 in hex
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ['https://bsc-testnet.public.blastapi.io'],
    blockExplorerUrls: ['https://testnet.bscscan.com']
  },
  ETHEREUM_SEPOLIA: {
    chainId: '0xaa36a7', // 11155111 in hex
    chainName: 'Ethereum Sepolia',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  }
};

export function useWeb3() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Connect to MetaMask wallet
   * Implements Command Pattern
   */
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask extension.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in MetaMask.');
      }

      // Create provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();

      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setProvider(web3Provider);
      setSigner(web3Signer);

    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setError(null);
  }, []);

  /**
   * Switch to specific chain
   * Implements Strategy Pattern for chain switching
   */
  const switchChain = useCallback(async (targetChain) => {
    try {
      setError(null);
      const chainConfig = CHAINS[targetChain];
      
      if (!chainConfig) {
        throw new Error(`Invalid chain: ${targetChain}`);
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainConfig.chainId }],
      });

    } catch (err) {
      // If chain hasn't been added to MetaMask
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CHAINS[targetChain]],
          });
        } catch (addError) {
          console.error('Error adding chain:', addError);
          setError('Failed to add chain to MetaMask');
        }
      } else {
        console.error('Error switching chain:', err);
        setError('Failed to switch chain');
      }
    }
  }, []);

  /**
   * Get chain name from chainId
   */
  const getChainName = useCallback((id) => {
    if (id === 97) return 'BSC Testnet';
    if (id === 11155111) return 'Ethereum Sepolia';
    return 'Unknown Chain';
  }, []);

  /**
   * Check if connected to specific chain
   */
  const isOnChain = useCallback((targetChain) => {
    if (!chainId) return false;
    if (targetChain === 'BSC_TESTNET') return chainId === 97;
    if (targetChain === 'ETHEREUM_SEPOLIA') return chainId === 11155111;
    return false;
  }, [chainId]);

  /**
   * Handle account changes
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(parseInt(newChainId, 16));
      window.location.reload(); // Reload to reset state
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [disconnect]);

  /**
   * Auto-connect if previously connected
   */
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        await connect();
      }
    };
    checkConnection();
  }, [connect]);

  return {
    account,
    chainId,
    provider,
    signer,
    isConnecting,
    isConnected: !!account,
    error,
    connect,
    disconnect,
    switchChain,
    getChainName,
    isOnChain,
    CHAINS
  };
}
