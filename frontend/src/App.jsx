/**
 * Main App Component
 * Implements Container Pattern for application structure
 * 
 * SOLID Principles:
 * - Single Responsibility: Orchestrates main app layout
 * - Open/Closed: Can add new features without modifying core
 * - Dependency Inversion: Uses composition of components
 */

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { WalletConnect } from './components/WalletConnect';
import { BalanceDisplay } from './components/BalanceDisplay';
import { BridgeForm } from './components/BridgeForm';
import { TransactionStatus } from './components/TransactionStatus';
import { Web3Provider } from './hooks/useWeb3.jsx';

function App() {
  const [latestEventId, setLatestEventId] = useState(null);

  const handleBridgeSuccess = (result) => {
    if (result.eventId) {
      setLatestEventId(result.eventId);
    }
  };

  return (
    <Web3Provider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cross-Chain Bridge
          </h1>
          <p className="text-gray-600">
            Bridge tokens between Ethereum Sepolia and Arbitrum Sepolia with multi-relayer consensus
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <WalletConnect />
            <BalanceDisplay />
            <BridgeForm onBridgeSuccess={handleBridgeSuccess} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <TransactionStatus eventId={latestEventId} />
            
            {/* Info Card */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3">How It Works</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-medium mb-1">Lock or Burn</p>
                    <p className="text-gray-600">
                      Lock tokens on source chain or burn wrapped tokens
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-medium mb-1">Multi-Relayer Consensus</p>
                    <p className="text-gray-600">
                      3 relayers detect event and sign (requires 2-of-3)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-medium mb-1">Mint or Unlock</p>
                    <p className="text-gray-600">
                      Tokens are minted on destination or unlocked on source
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Info */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3">Architecture</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600">Smart Contracts:</span>
                  <span className="font-medium">Solidity + OpenZeppelin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Backend:</span>
                  <span className="font-medium">AWS Lambda + SAM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Database:</span>
                  <span className="font-medium">DynamoDB Single Table</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Consensus:</span>
                  <span className="font-medium">2-of-3 Multi-Sig</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>Built with SOLID principles, Design Patterns, and DRY architecture</p>
          <p className="mt-1">Ethereum Sepolia ↔ Arbitrum Sepolia</p>
        </footer>
        </div>
      </div>
    </Web3Provider>
  );
}

export default App;
