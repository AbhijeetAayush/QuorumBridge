/**
 * BalanceDisplay Component - Shows token balances
 * Implements Observer Pattern (reacts to balance changes)
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays balances
 * - Open/Closed: Can extend with new balance types
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from '../hooks/useWeb3.jsx';
import { useBridgeContract } from '../hooks/useBridgeContract';

export function BalanceDisplay() {
  const { isConnected, account, chainId, signer, provider } = useWeb3();
  const { getBalance } = useBridgeContract();
  
  const [ethereumBalance, setEthereumBalance] = useState('0');
  const [arbitrumBalance, setArbitrumBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchBalances = useCallback(async () => {
    // Guard against fetching when disconnected
    if (!isConnected || !account || !signer) {
      console.log('Not fetching balances - not connected');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching balances for account:', account);
      const requests = [];
      if (chainId === 11155111) {
        requests.push(getBalance('ETHEREUM', provider));
        requests.push(Promise.resolve(null));
      } else if (chainId === 421614) {
        requests.push(Promise.resolve(null));
        requests.push(getBalance('ARBITRUM', provider));
      } else {
        requests.push(Promise.resolve(null), Promise.resolve(null));
      }

      const [ethereum, arbitrum] = await Promise.allSettled(requests);

      if (ethereum.status === 'fulfilled' && ethereum.value !== null) {
        setEthereumBalance(ethereum.value);
        console.log('Ethereum balance:', ethereum.value);
      } else {
        if (ethereum.status === 'rejected') {
          console.error('Ethereum balance error:', ethereum.reason);
        }
        setEthereumBalance('0');
      }

      if (arbitrum.status === 'fulfilled' && arbitrum.value !== null) {
        setArbitrumBalance(arbitrum.value);
        console.log('Arbitrum balance:', arbitrum.value);
      } else {
        if (arbitrum.status === 'rejected') {
          console.error('Arbitrum balance error:', arbitrum.reason);
        }
        setArbitrumBalance('0');
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, signer, getBalance]);

  useEffect(() => {
    console.log('BalanceDisplay effect - isConnected:', isConnected, 'account:', account);

    if (intervalRef.current) {
      console.log('Clearing existing interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isConnected && account && signer) {
      console.log('Starting balance fetch loop');
      fetchBalances();
      intervalRef.current = setInterval(fetchBalances, 10000);
    } else {
      console.log('Not connected, resetting balances');
      setEthereumBalance('0');
      setArbitrumBalance('0');
    }

    return () => {
      if (intervalRef.current) {
        console.log('Cleanup: Clearing balance fetch interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isConnected, account, signer, fetchBalances]);

  if (!isConnected) {
    return (
      <div className="w-full bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Token Balances</h2>
        <p className="text-gray-500">Connect wallet to view balances</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow-md rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Token Balances</h2>
        <button
          onClick={fetchBalances}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ethereum Sepolia Balance (wrapped) */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-800">Ethereum Sepolia</p>
            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
              Wrapped
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {parseFloat(ethereumBalance).toFixed(4)} wCCBT
          </p>
          {chainId === 11155111 && (
            <p className="text-xs text-blue-700 mt-1">Current Chain</p>
          )}
        </div>

        {/* Arbitrum Sepolia Balance (original) */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-800">Arbitrum Sepolia</p>
            <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
              Original
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {parseFloat(arbitrumBalance).toFixed(4)} CCBT
          </p>
          {chainId === 421614 && (
            <p className="text-xs text-purple-700 mt-1">Current Chain</p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          Total Supply Constant: {(parseFloat(ethereumBalance) + parseFloat(arbitrumBalance)).toFixed(4)} tokens
        </p>
      </div>
    </div>
  );
}
