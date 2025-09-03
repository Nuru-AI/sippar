/**
 * Transaction History Component
 * Shows complete history of mint and redeem operations
 */

import React, { useState, useEffect } from 'react';
import { useAlgorandIdentity } from '../hooks/useAlgorandIdentity';

interface Transaction {
  id: string;
  type: 'mint' | 'redeem';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  txHash?: string;
  algorandTxId?: string;
  icpTxId?: string;
  fromAddress?: string;
  toAddress?: string;
  fee?: number;
}

const TransactionHistory: React.FC = () => {
  const { user } = useAlgorandIdentity();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'mint' | 'redeem'>('all');

  useEffect(() => {
    if (user?.principal) {
      loadTransactionHistory();
    }
  }, [user]);

  const loadTransactionHistory = async () => {
    if (!user?.principal) return;
    
    setLoading(true);
    try {
      // For Phase 2, simulate transaction history
      // In Phase 3, this would call the backend API
      const mockTransactions: Transaction[] = [
        {
          id: 'tx-001',
          type: 'mint',
          amount: 5.5,
          status: 'completed',
          timestamp: '2025-09-03T14:13:06.541Z',
          algorandTxId: 'ALG-12345',
          icpTxId: 'ICP-MINT-1756908786541',
          fromAddress: 'ONUXA4DBOIWWC3DHN5ZGC3TEFVTWSY3ONYWXK4DHNRRC25LCMVUPLES5LE',
          fee: 0.001
        },
        {
          id: 'tx-002',
          type: 'redeem',
          amount: 2.5,
          status: 'completed',
          timestamp: '2025-09-03T15:21:43.419Z',
          algorandTxId: 'ALGO-OUT-1756912903419',
          icpTxId: 'ICP-REDEEM-1756912903419',
          toAddress: 'ONUXA4DBOIWWC3DHN5ZGC3TEFVTWSY3ONYWXK4DHNRRC25LCMVUPLES5LE',
          fee: 0.001
        },
        {
          id: 'tx-003',
          type: 'mint',
          amount: 1.0,
          status: 'pending',
          timestamp: '2025-09-03T15:25:13.423Z',
          algorandTxId: 'ALG-PENDING',
          icpTxId: 'ICP-MINT-1756913113423',
          fromAddress: 'ONUXA4DBOIWWC3DHN5ZGC3TEFVTWSY3ONYWXK4DHNRRC25LCMVUPLES5LE',
          fee: 0.001
        }
      ];
      
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('❌ Failed to load transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' ? true : tx.type === filter
  );

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string): string => {
    return type === 'mint' ? '🪙' : '💸';
  };

  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please log in to view transaction history</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          📊 Transaction History
        </h2>
        <p className="text-gray-400">
          Complete history of your mint and redeem operations
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Transactions
            </button>
            <button
              onClick={() => setFilter('mint')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'mint'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🪙 Mint
            </button>
            <button
              onClick={() => setFilter('redeem')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'redeem'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💸 Redeem
            </button>
          </div>
          
          <button
            onClick={loadTransactionHistory}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 mt-2">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-gray-400">No transactions found</p>
            <p className="text-gray-500 text-sm">Your mint and redeem operations will appear here</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div key={tx.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between">
                {/* Left Side - Main Info */}
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{getTypeIcon(tx.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-white capitalize">
                        {tx.type} Operation
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="text-gray-300 space-y-1">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium">Amount:</span>
                        <span className="font-mono text-blue-400">{tx.amount.toFixed(6)} {tx.type === 'mint' ? 'ALGO' : 'ckALGO'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className="font-medium">Date:</span>
                        <span className="text-gray-400">{formatDate(tx.timestamp)}</span>
                      </div>
                      
                      {tx.fee && (
                        <div className="flex items-center space-x-4">
                          <span className="font-medium">Network Fee:</span>
                          <span className="text-gray-400">{tx.fee} ALGO</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side - Status & Actions */}
                <div className="text-right space-y-2">
                  {tx.status === 'pending' && (
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <div className="animate-spin w-4 h-4 border-b-2 border-yellow-400 rounded-full"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                  
                  {tx.status === 'completed' && (
                    <div className="text-green-400 text-sm">✅ Completed</div>
                  )}
                  
                  {tx.status === 'failed' && (
                    <div className="text-red-400 text-sm">❌ Failed</div>
                  )}
                </div>
              </div>

              {/* Expandable Details */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {/* Transaction IDs */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300">Transaction IDs:</h4>
                    {tx.icpTxId && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">ICP:</span>
                        <code className="text-blue-400 text-xs">{tx.icpTxId}</code>
                      </div>
                    )}
                    {tx.algorandTxId && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Algorand:</span>
                        <code className="text-green-400 text-xs">{tx.algorandTxId}</code>
                      </div>
                    )}
                  </div>

                  {/* Addresses */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300">Addresses:</h4>
                    {tx.fromAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">From:</span>
                        <code className="text-yellow-400 text-xs">{truncateAddress(tx.fromAddress)}</code>
                      </div>
                    )}
                    {tx.toAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">To:</span>
                        <code className="text-yellow-400 text-xs">{truncateAddress(tx.toAddress)}</code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-4">
                  {tx.algorandTxId && tx.status === 'completed' && (
                    <button
                      onClick={() => window.open(`https://testnet.algoexplorer.io/tx/${tx.algorandTxId}`, '_blank')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      View on AlgoExplorer
                    </button>
                  )}
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(tx.id)}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                  >
                    Copy TX ID
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {transactions.filter(tx => tx.type === 'mint' && tx.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-400">Completed Mints</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">
                {transactions.filter(tx => tx.type === 'redeem' && tx.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-400">Completed Redeems</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {transactions.filter(tx => tx.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;