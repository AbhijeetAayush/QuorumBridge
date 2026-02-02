/**
 * useWeb3 Hook - Manages Web3 wallet connection
 * Simplified version - clean disconnect/reconnect flow
 * 
 * SOLID Principles:
 * - Single Responsibility: Only manages Web3 connection
 * - Open/Closed: Can extend with new wallet providers
 * - Dependency Inversion: Components depend on this hook abstraction
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { ethers } from 'ethers';

const CHAINS = {
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
  },
  ARBITRUM_SEPOLIA: {
    chainId: '0x66eec', // 421614 in hex
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io']
  }
};

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userDisconnected, setUserDisconnected] = useState(() => {
    return localStorage.getItem('walletDisconnected') === 'true';
  });

  /**
   * Update Web3 state with provider info
   */
  const updateWeb3State = useCallback(async (web3Provider, userAccount) => {
    try {
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();

      console.log('Updated Web3 state - Account:', userAccount, 'Chain:', network.chainId);
      
      setAccount(userAccount);
      setChainId(Number(network.chainId));
      setProvider(web3Provider);
      setSigner(web3Signer);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error('Error updating Web3 state:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Connect to MetaMask wallet
   * Shows popup every time
   */
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setUserDisconnected(false);
      console.log('Connect: Requesting accounts...');

      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // This ALWAYS shows the MetaMask popup
      if (window.ethereum.request) {
        try {
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (permissionError) {
          // If user rejects permissions, surface error
          if (permissionError?.code === 4001) {
            throw permissionError;
          }
          // Otherwise continue to request accounts
        }
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      console.log('Connect: User approved, got accounts:', accounts);
      
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      await updateWeb3State(web3Provider, accounts[0]);
      setUserDisconnected(false);
      localStorage.removeItem('walletDisconnected');

    } catch (err) {
      console.error('Connect error:', err);
      setError(err.message);
      setIsConnecting(false);
    } finally {
      setIsConnecting(false);
    }
  }, [updateWeb3State]);

  /**
   * Disconnect wallet completely
   */
  const disconnect = useCallback(() => {
    console.log('Disconnect: Clearing all state');
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setError(null);
    setUserDisconnected(true);
    localStorage.setItem('walletDisconnected', 'true');
    if (window.ethereum?.request) {
      window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      }).catch(() => {});
    }
  }, []);

  /**
   * Switch to specific chain
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
    if (id === 11155111) return 'Ethereum Sepolia';
    if (id === 421614) return 'Arbitrum Sepolia';
    return 'Unknown Chain';
  }, []);

  /**
   * Check if connected to specific chain
   */
  const isOnChain = useCallback((targetChain) => {
    if (!chainId) return false;
    if (targetChain === 'ETHEREUM_SEPOLIA') return chainId === 11155111;
    if (targetChain === 'ARBITRUM_SEPOLIA') return chainId === 421614;
    return false;
  }, [chainId]);

  /**
   * Listen for MetaMask account/chain changes
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      console.log('MetaMask accounts changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected from MetaMask
        disconnect();
      } else if (isConnected && account) {
        // Update to new account
        setAccount(accounts[0]);
      }
      // If not connected, don't auto-reconnect
    };

    const handleChainChanged = (newChainId) => {
      console.log('MetaMask chain changed to:', newChainId);
      if (isConnected) {
        window.location.reload();
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isConnected, account, disconnect]);

  /**
   * Check if already connected on mount
   * (silent check, no popup)
   */
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (!window.ethereum) return;
        if (userDisconnected) {
          console.log('Mount: Skipping auto-connect (user disconnected)');
          return;
        }

        // Check if user was previously connected
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });

        console.log('Mount: Checking existing connection, accounts:', accounts);

        if (accounts && accounts.length > 0) {
          console.log('Mount: Found existing connection, auto-connecting silently');
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          await updateWeb3State(web3Provider, accounts[0]);
        } else {
          console.log('Mount: No existing connection');
        }
      } catch (err) {
        console.error('Check connection error:', err);
      }
    };

    checkConnection();
  }, [userDisconnected, updateWeb3State]); // Re-check if userDisconnected flips

  const value = useMemo(() => ({
    account,
    chainId,
    provider,
    signer,
    isConnecting,
    isConnected,
    error,
    connect,
    disconnect,
    switchChain,
    getChainName,
    isOnChain,
    CHAINS
  }), [
    account,
    chainId,
    provider,
    signer,
    isConnecting,
    isConnected,
    error,
    connect,
    disconnect,
    switchChain,
    getChainName,
    isOnChain
  ]);

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return ctx;
}
