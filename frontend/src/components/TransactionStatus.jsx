/**
 * TransactionStatus Component - Shows bridge transaction status
 * Implements Observer Pattern for status updates
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays transaction status
 * - Open/Closed: Can extend with new status types
 */

import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

export function TransactionStatus({ eventId: initialEventId }) {
  const [eventId, setEventId] = useState(initialEventId || '');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async (id) => {
    if (!id) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/status?eventId=${id}`);
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch (err) {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEventId) {
      setEventId(initialEventId);
      fetchStatus(initialEventId);
      
      // Poll for status updates every 5 seconds
      const interval = setInterval(() => {
        fetchStatus(initialEventId);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [initialEventId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchStatus(eventId);
  };

  const getStatusBadge = (statusText) => {
    const statusColors = {
      'PENDING_MINT': 'bg-yellow-100 text-yellow-800',
      'PENDING_UNLOCK': 'bg-yellow-100 text-yellow-800',
      'MINTED': 'bg-green-100 text-green-800',
      'UNLOCKED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800'
    };
    
    return statusColors[statusText] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Transaction Status</h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Enter Event ID (0x...)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !eventId}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Check'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {status && status.event && (
        <div className="space-y-4">
          {/* Event Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Event Details</h3>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(status.event.status)}`}>
                {status.event.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Chain:</span>
                <span className="font-medium">{status.event.chain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{(parseInt(status.event.amount) / 1e18).toFixed(4)} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-mono text-xs">{status.event.fromAddress.substring(0, 10)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction:</span>
                <a 
                  href={`${status.event.chain === 'BSC' ? 'https://testnet.bscscan.com' : 'https://sepolia.etherscan.io'}/tx/${status.event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-mono text-xs"
                >
                  {status.event.txHash.substring(0, 10)}...
                </a>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Relayer Signatures</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl font-bold text-blue-600">{status.signatureCount}</div>
              <div className="text-sm text-gray-600">/ 2 required</div>
            </div>
            
            {status.signatures && status.signatures.length > 0 && (
              <div className="mt-3 space-y-1">
                {status.signatures.map((sig, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-600">Relayer {sig.relayerId}</span>
                    <span className="text-gray-400">{new Date(sig.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execution Status */}
          {status.execution && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Execution Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(status.execution.status)}`}>
                    {status.execution.status}
                  </span>
                </div>
                {status.execution.txHash && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction:</span>
                    <span className="font-mono text-xs text-blue-600">
                      {status.execution.txHash.substring(0, 10)}...
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="text-xs">{new Date(status.execution.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
