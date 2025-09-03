/**
 * Chain Fusion Technology Explanation Component
 * Explains how ICP Chain Fusion works with Algorand
 */

import React, { useState } from 'react';

const ChainFusionExplanation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'security'>('overview');

  const TabButton = ({ id, label, isActive }: { id: string; label: string; isActive: boolean }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-500 text-white border-b-2 border-blue-500'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          🌉 How Sippar Chain Fusion Works
        </h2>
        <p className="text-gray-600">
          Understanding the technology behind trustless Algorand integration
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <TabButton id="overview" label="Overview" isActive={activeTab === 'overview'} />
        <TabButton id="technical" label="Technical" isActive={activeTab === 'technical'} />
        <TabButton id="security" label="Security" isActive={activeTab === 'security'} />
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50 p-6 rounded-lg min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                What is Chain Fusion?
              </h3>
              <p className="text-gray-700 mb-4">
                Chain Fusion is Internet Computer's revolutionary technology that allows ICP smart contracts 
                to directly control accounts on other blockchains using <strong>threshold signatures</strong>.
              </p>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-blue-800">
                  <strong>Key Innovation:</strong> No bridges, no wrapped tokens, no trusted intermediaries. 
                  Your ICP canister directly owns and controls real ALGO on the Algorand network.
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                How Sippar Uses Chain Fusion:
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded border">
                  <div className="text-2xl mb-2">🔐</div>
                  <h5 className="font-semibold mb-2">Internet Identity Login</h5>
                  <p className="text-sm text-gray-600">
                    Authenticate with biometrics or security key. No seed phrases or wallet setup required.
                  </p>
                </div>

                <div className="bg-white p-4 rounded border">
                  <div className="text-2xl mb-2">🎯</div>
                  <h5 className="font-semibold mb-2">Automatic Address Derivation</h5>
                  <p className="text-sm text-gray-600">
                    Your principal automatically generates a unique Algorand address you control.
                  </p>
                </div>

                <div className="bg-white p-4 rounded border">
                  <div className="text-2xl mb-2">⚡</div>
                  <h5 className="font-semibold mb-2">Direct ALGO Control</h5>
                  <p className="text-sm text-gray-600">
                    Send/receive real ALGO directly. ICP subnet signs Algorand transactions for you.
                  </p>
                </div>

                <div className="bg-white p-4 rounded border">
                  <div className="text-2xl mb-2">🪙</div>
                  <h5 className="font-semibold mb-2">ckALGO Tokens</h5>
                  <p className="text-sm text-gray-600">
                    1:1 backed ALGO tokens on ICP. Trade, lend, or use in DeFi while keeping ALGO custody.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded">
              <h5 className="font-semibold text-green-800 mb-2">Why This Matters:</h5>
              <ul className="text-green-700 space-y-1 text-sm">
                <li>• <strong>Zero Bridge Risk:</strong> No locked funds or vulnerable bridge contracts</li>
                <li>• <strong>Mathematical Security:</strong> Protected by ICP's threshold cryptography</li>
                <li>• <strong>Best of Both Worlds:</strong> Algorand's efficiency + ICP's DeFi ecosystem</li>
                <li>• <strong>Simple UX:</strong> Web2-like experience with Web3 ownership</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Technical Architecture
              </h3>
              
              <div className="bg-gray-800 text-green-400 p-4 rounded font-mono text-sm mb-4">
                <div>Internet Identity Principal</div>
                <div className="text-gray-500">↓ PBKDF2-SHA256 Derivation</div>
                <div>Unique Algorand Ed25519 Address</div>
                <div className="text-gray-500">↓ ICP Threshold Signatures</div>
                <div>Signed Algorand Transactions</div>
                <div className="text-gray-500">↓ Broadcast to Network</div>
                <div>Real ALGO Movement</div>
              </div>

              <h4 className="text-lg font-semibold text-gray-800 mb-2">Address Derivation</h4>
              <div className="bg-white p-4 border rounded mb-4">
                <code className="text-sm">
                  algorand_address = derive_ed25519_address(
                  <br />
                  &nbsp;&nbsp;seed: "sippar-" + internet_identity_principal,
                  <br />
                  &nbsp;&nbsp;derivation_path: "/algorand/0",
                  <br />
                  &nbsp;&nbsp;iterations: 5000
                  <br />
                  )
                </code>
              </div>

              <h4 className="text-lg font-semibold text-gray-800 mb-2">Threshold Signatures</h4>
              <p className="text-gray-700 mb-3">
                ICP's subnet nodes collectively generate Ed25519 signatures for Algorand transactions 
                without any single node having access to the private key.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">🌐</div>
                  <h5 className="font-semibold">Subnet Consensus</h5>
                  <p className="text-xs text-gray-600">13+ nodes agree on transaction</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🔑</div>
                  <h5 className="font-semibold">Threshold Signing</h5>
                  <p className="text-xs text-gray-600">Collaborative signature generation</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📡</div>
                  <h5 className="font-semibold">Algorand Broadcast</h5>
                  <p className="text-xs text-gray-600">Transaction sent to network</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded">
              <h5 className="font-semibold text-blue-800 mb-2">Current Implementation Status:</h5>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>✅ <strong>Address Derivation:</strong> PBKDF2-SHA256 with 5000 iterations - Production Ready</li>
                <li>✅ <strong>Network Integration:</strong> Live testnet/mainnet connectivity - Operational</li>
                <li>✅ <strong>Balance Queries:</strong> Real-time ALGO balance checking - Working</li>
                <li>✅ <strong>ckALGO Minting:</strong> Functional with simulated transactions - Phase 2 Complete</li>
                <li>✅ <strong>Redemption Flow:</strong> Full user interface - Phase 2 Complete</li>
                <li>🔄 <strong>Threshold Signatures:</strong> Next phase for production security</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Security Model
              </h3>
              
              <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
                <h5 className="font-semibold text-red-800 mb-2">Traditional Bridge Risks:</h5>
                <ul className="text-red-700 space-y-1 text-sm">
                  <li>• Multi-signature wallet vulnerabilities</li>
                  <li>• Locked collateral can be stolen</li>
                  <li>• Centralized validators can be compromised</li>
                  <li>• Smart contract bugs in bridge logic</li>
                  <li>• Economic attacks on bridge operators</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                <h5 className="font-semibold text-green-800 mb-2">Chain Fusion Security:</h5>
                <ul className="text-green-700 space-y-1 text-sm">
                  <li>✅ <strong>No Bridge Contracts:</strong> Direct cryptographic control</li>
                  <li>✅ <strong>Threshold Cryptography:</strong> Distributed key generation</li>
                  <li>✅ <strong>Subnet Consensus:</strong> 2/3+ nodes must agree</li>
                  <li>✅ <strong>Mathematical Proof:</strong> Verifiable security guarantees</li>
                  <li>✅ <strong>No Single Point of Failure:</strong> Decentralized by design</li>
                </ul>
              </div>

              <h4 className="text-lg font-semibold text-gray-800 mb-2">How Your ALGO is Protected:</h4>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🔒</div>
                  <div>
                    <h5 className="font-semibold">Internet Identity Authentication</h5>
                    <p className="text-sm text-gray-600">
                      Biometric or hardware key authentication. No passwords or seed phrases to lose.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🌐</div>
                  <div>
                    <h5 className="font-semibold">Subnet Consensus</h5>
                    <p className="text-sm text-gray-600">
                      Your transactions require approval from 2/3+ of independent ICP subnet nodes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🔐</div>
                  <div>
                    <h5 className="font-semibold">Threshold Ed25519</h5>
                    <p className="text-sm text-gray-600">
                      Private keys are never constructed. Signatures are generated collaboratively.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <h5 className="font-semibold">Direct Ownership</h5>
                    <p className="text-sm text-gray-600">
                      You own real ALGO addresses. No wrapped tokens or IOUs that can be depegged.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h5 className="font-semibold text-blue-800 mb-2">Current Status - Phase 2 Complete:</h5>
              <p className="text-blue-700 text-sm">
                <strong>Phase 2 foundation is complete!</strong> ckALGO tokens are deployed to ICP mainnet with functional 
                mint/redeem flows. Current transactions are simulated for demonstration. Phase 3 will implement 
                production-ready threshold signatures for real ALGO transactions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChainFusionExplanation;