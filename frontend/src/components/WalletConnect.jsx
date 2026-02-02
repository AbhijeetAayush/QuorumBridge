/**
 * WalletConnect Component - Handles wallet connection UI
 * Implements Presentational Component Pattern
 * 
 * SOLID Principles:
 * - Single Responsibility: Only renders wallet connection UI
 * - Open/Closed: Can extend UI without modifying logic
 */

import React from 'react';
import { useWeb3 } from '../hooks/useWeb3.jsx';

export function WalletConnect() {
  const { 
    account, 
    chainId, 
    isConnecting, 
    isConnected, 
    error, 
    connect, 
    disconnect,
    getChainName
  } = useWeb3();

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="w-full bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Wallet Connection</h2>
      
      {!isConnected ? (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Connected Account</p>
              <p className="font-mono font-semibold">{formatAddress(account)}</p>
            </div>
            <button
              onClick={disconnect}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Disconnect
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Network</p>
            <p className="font-semibold">{getChainName(chainId)}</p>
            <p className="text-xs text-gray-500 mt-1">Chain ID: {chainId}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
