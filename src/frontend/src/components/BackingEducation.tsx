/**
 * Backing Education Component
 * Sprint X Phase 3.2: Education Content explaining real backing vs simulation
 *
 * Provides clear explanation of what 1:1 backing means and how it differs
 * from traditional bridge simulation models.
 */

import React, { useState } from 'react';

interface BackingEducationProps {
  className?: string;
}

const BackingEducation: React.FC<BackingEducationProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'backing' | 'security' | 'verification'>('backing');

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        📚 Understanding Real 1:1 Backing
        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
          Educational
        </span>
      </h3>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 bg-gray-700/30 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('backing')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'backing'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
          }`}
        >
          🔗 Real Backing
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
          }`}
        >
          🔒 Security Model
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'verification'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
          }`}
        >
          ✅ Verification
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'backing' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <h4 className="text-green-300 font-medium mb-2">✅ Sippar: Real 1:1 Backing</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>Mathematical Reality:</strong> Each ckALGO token is backed by exactly 1 ALGO held in ICP subnet custody.</p>
                <p><strong>Physical Custody:</strong> Your ALGO is actually transferred to threshold-controlled addresses.</p>
                <p><strong>Cannot Be Spent:</strong> Locked ALGO cannot be used for any other purpose until ckALGO is redeemed.</p>
                <p><strong>Verifiable:</strong> You can verify the exact ALGO amount backing your ckALGO tokens in real-time.</p>
              </div>
            </div>

            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <h4 className="text-red-300 font-medium mb-2">❌ Traditional Bridges: Simulation Model</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>Accounting Tricks:</strong> Tokens created without corresponding asset deposits.</p>
                <p><strong>User Keeps Original:</strong> You keep your ALGO while also receiving "wrapped" tokens.</p>
                <p><strong>Double Spending:</strong> The same ALGO can be spent while wrapped tokens exist.</p>
                <p><strong>Trust Required:</strong> Users must trust the bridge operator to maintain backing.</p>
              </div>
            </div>

            <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <div className="text-xs text-yellow-200">
                <strong>🔥 The Sippar Difference:</strong> We use Internet Computer's threshold cryptography to
                mathematically prove custody. Your ALGO is actually locked in addresses controlled by ICP subnet consensus -
                no single party can access it except through the redemption process.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <h4 className="text-blue-300 font-medium mb-2">🔒 Threshold Cryptography Security</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>No Single Point of Failure:</strong> ICP subnet (13+ nodes) must reach consensus to sign transactions.</p>
                <p><strong>Ed25519 Signatures:</strong> Same cryptographic standard used by Algorand itself.</p>
                <p><strong>Mathematical Proof:</strong> Cryptographic signatures prove authentic custody control.</p>
                <p><strong>Decentralized Control:</strong> No single entity can access locked ALGO.</p>
              </div>
            </div>

            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <h4 className="text-orange-300 font-medium mb-2">⚠️ Traditional Bridge Risks</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>Centralized Control:</strong> Single operator controls all "backed" assets.</p>
                <p><strong>Hack Risk:</strong> One compromised system can drain all user funds.</p>
                <p><strong>Rug Pull Risk:</strong> Operators can disappear with user assets.</p>
                <p><strong>Regulatory Risk:</strong> Government action can freeze or seize operator assets.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-700/30 border border-gray-600/30 rounded text-center">
                <div className="text-green-400 font-bold">0%</div>
                <div className="text-xs text-gray-400">Admin Keys</div>
              </div>
              <div className="p-3 bg-gray-700/30 border border-gray-600/30 rounded text-center">
                <div className="text-green-400 font-bold">13+</div>
                <div className="text-xs text-gray-400">Consensus Nodes</div>
              </div>
              <div className="p-3 bg-gray-700/30 border border-gray-600/30 rounded text-center">
                <div className="text-green-400 font-bold">100%</div>
                <div className="text-xs text-gray-400">Decentralized</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <h4 className="text-purple-300 font-medium mb-2">✅ Real-Time Verification Methods</h4>
              <div className="text-sm text-gray-300 space-y-3">
                <div>
                  <strong>1. Live Reserve Ratios:</strong>
                  <div className="text-xs text-gray-400 mt-1">Check system-wide backing ratio updated every 30 seconds.</div>
                </div>
                <div>
                  <strong>2. Custody Address Verification:</strong>
                  <div className="text-xs text-gray-400 mt-1">View exact addresses holding ALGO backing your ckALGO tokens.</div>
                </div>
                <div>
                  <strong>3. Algorand Explorer:</strong>
                  <div className="text-xs text-gray-400 mt-1">Independently verify balances on Algorand blockchain explorer.</div>
                </div>
                <div>
                  <strong>4. Cryptographic Proofs:</strong>
                  <div className="text-xs text-gray-400 mt-1">Download mathematical proofs of custody signed by ICP subnet.</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-700/30 border border-gray-600/30 rounded-lg">
              <h4 className="text-gray-300 font-medium mb-2">🔍 How to Verify Your Holdings</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Check the "Reserve Verification" section in your dashboard</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Click "Verify Reserves" to see real-time system health</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>View custody addresses and cross-check on Algorand explorer</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  <span>Download cryptographic proof-of-reserves for your records</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="text-xs text-green-200">
                <strong>💡 Pro Tip:</strong> Unlike traditional bridges where you must "trust" the operator,
                Sippar uses mathematics and cryptography that you can verify independently. Don't trust - verify!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="text-xs text-gray-400 text-center">
          <span>Want to verify reserves right now?</span>
          <button
            onClick={() => {
              fetch('https://nuru.network/api/sippar/reserves/status')
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    const ratio = (data.data.reserveRatio * 100).toFixed(1);
                    alert(`✅ Live Verification:\n\nReserve Ratio: ${ratio}%\nTotal ckALGO Supply: ${data.data.totalCkAlgoSupply}\nTotal ALGO Locked: ${data.data.totalLockedAlgo}\nSystem Health: ${data.data.healthStatus}\n\nLast Updated: ${new Date(data.data.lastVerificationTime).toLocaleString()}`);
                  }
                })
                .catch(() => alert('❌ Reserve verification service temporarily unavailable. Please try again later.'));
            }}
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            🔍 Check Live Reserves
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackingEducation;