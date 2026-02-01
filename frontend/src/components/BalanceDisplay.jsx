/**
 * BalanceDisplay Component - Shows token balances
 * Implements Observer Pattern (reacts to balance changes)
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays balances
 * - Open/Closed: Can extend with new balance types
 */

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useBridgeContract } from '../hooks/useBridgeContract';

export function BalanceDisplay() {
  const { isConnected, account, chainId } = useWeb3();
  const { getBalance } = useBridgeContract();
  
  const [bscBalance, setBscBalance] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  const fetchBalances = async () => {
    if (!isConnected || !account) return;
    
    setLoading(true);
    try {
      const [bsc, eth] = await Promise.allSettled([
        getBalance('BSC'),
        getBalance('ETHEREUM')
      ]);

      setBscBalance(bsc.status === 'fulfilled' ? bsc.value : '0');
      setEthBalance(eth.status === 'fulfilled' ? eth.value : '0');
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    
    // Refresh balances every 10 seconds
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [isConnected, account, chainId]);

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
        {/* BSC Balance */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-yellow-800">BSC Testnet</p>
            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
              Original
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            {parseFloat(bscBalance).toFixed(4)} CCBT
          </p>
          {chainId === 97 && (
            <p className="text-xs text-yellow-700 mt-1">Current Chain</p>
          )}
        </div>

        {/* Ethereum Balance */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-800">Ethereum Sepolia</p>
            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
              Wrapped
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {parseFloat(ethBalance).toFixed(4)} wCCBT
          </p>
          {chainId === 11155111 && (
            <p className="text-xs text-blue-700 mt-1">Current Chain</p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          Total Supply Constant: {(parseFloat(bscBalance) + parseFloat(ethBalance)).toFixed(4)} tokens
        </p>
      </div>
    </div>
  );
}
