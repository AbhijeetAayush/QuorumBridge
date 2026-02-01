/**
 * BridgeForm Component - Main bridge interface
 * Implements Command Pattern for bridge operations
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles bridge form UI and logic
 * - Open/Closed: Can extend with new bridge directions
 */

import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useBridgeContract } from '../hooks/useBridgeContract';
import toast from 'react-hot-toast';

export function BridgeForm({ onBridgeSuccess }) {
  const { isConnected, chainId, switchChain, isOnChain } = useWeb3();
  const { lockTokens, burnTokens, isLoading } = useBridgeContract();
  
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('BSC_TO_ETH'); // BSC_TO_ETH or ETH_TO_BSC

  const handleDirectionChange = async (newDirection) => {
    setDirection(newDirection);
    
    // Auto-switch chain
    const targetChain = newDirection === 'BSC_TO_ETH' ? 'BSC_TESTNET' : 'ETHEREUM_SEPOLIA';
    try {
      await switchChain(targetChain);
    } catch (error) {
      console.error('Failed to switch chain:', error);
    }
  };

  const handleBridge = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      let result;
      const loadingToast = toast.loading('Processing bridge transaction...');

      if (direction === 'BSC_TO_ETH') {
        if (!isOnChain('BSC_TESTNET')) {
          toast.error('Please switch to BSC Testnet', { id: loadingToast });
          return;
        }
        result = await lockTokens(amount);
        toast.success(`Tokens locked on BSC! Transaction: ${result.txHash.substring(0, 10)}...`, { 
          id: loadingToast 
        });
      } else {
        if (!isOnChain('ETHEREUM_SEPOLIA')) {
          toast.error('Please switch to Ethereum Sepolia', { id: loadingToast });
          return;
        }
        result = await burnTokens(amount);
        toast.success(`Tokens burned on Ethereum! Transaction: ${result.txHash.substring(0, 10)}...`, { 
          id: loadingToast 
        });
      }

      // Clear form
      setAmount('');
      
      // Notify parent
      if (onBridgeSuccess) {
        onBridgeSuccess(result);
      }

    } catch (error) {
      console.error('Bridge error:', error);
      toast.error(error.message || 'Bridge transaction failed');
    }
  };

  const getSourceChain = () => direction === 'BSC_TO_ETH' ? 'BSC Testnet' : 'Ethereum Sepolia';
  const getDestChain = () => direction === 'BSC_TO_ETH' ? 'Ethereum Sepolia' : 'BSC Testnet';
  const isCorrectChain = () => {
    if (direction === 'BSC_TO_ETH') return isOnChain('BSC_TESTNET');
    return isOnChain('ETHEREUM_SEPOLIA');
  };

  if (!isConnected) {
    return (
      <div className="w-full bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Bridge Tokens</h2>
        <p className="text-gray-500">Connect wallet to start bridging</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">Bridge Tokens</h2>

      {/* Direction Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bridge Direction
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleDirectionChange('BSC_TO_ETH')}
            className={`p-4 border-2 rounded-lg font-medium transition ${
              direction === 'BSC_TO_ETH'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="text-sm mb-1">BSC → Ethereum</div>
            <div className="text-xs text-gray-500">Lock & Mint</div>
          </button>
          
          <button
            onClick={() => handleDirectionChange('ETH_TO_BSC')}
            className={`p-4 border-2 rounded-lg font-medium transition ${
              direction === 'ETH_TO_BSC'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="text-sm mb-1">Ethereum → BSC</div>
            <div className="text-xs text-gray-500">Burn & Unlock</div>
          </button>
        </div>
      </div>

      {/* Chain Warning */}
      {!isCorrectChain() && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            Please switch to <strong>{getSourceChain()}</strong> to bridge
          </p>
        </div>
      )}

      {/* Bridge Form */}
      <form onSubmit={handleBridge} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.0001"
            min="0"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || !isCorrectChain()}
          />
        </div>

        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">From:</span>
            <span className="font-medium">{getSourceChain()}</span>
          </div>
          <div className="flex justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">To:</span>
            <span className="font-medium">{getDestChain()}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isCorrectChain() || !amount}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Bridge Tokens'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> Bridge transactions require multi-relayer consensus (2-of-3 signatures). 
          Minting/unlocking typically completes within 1-2 minutes.
        </p>
      </div>
    </div>
  );
}
