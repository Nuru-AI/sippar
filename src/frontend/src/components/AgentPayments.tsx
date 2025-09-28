import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAlgorandIdentity } from '../hooks/useAlgorandIdentity';
import sipparAPI from '../services/SipparAPIService';
import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost_per_interaction: number;
  platform: string;
  canisterId?: string; // For ICP agents
  fetchAddress?: string; // For Fetch.ai agents
}

interface Transaction {
  id: string;
  from_agent: string;
  to_agent: string;
  amount: number;
  fee: number;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
}

const AgentPayments: React.FC = () => {
  const { principal, ckAlgoBalance } = useAuthStore();
  const { user, credentials } = useAlgorandIdentity();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedFromAgent, setSelectedFromAgent] = useState('');
  const [selectedToAgent, setSelectedToAgent] = useState('');
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [revenue, setRevenue] = useState({ total: 0, count: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [isRealMode, setIsRealMode] = useState(false); // Toggle between real and demo mode

  const API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://nuru.network/api/sippar/elna'
    : 'http://localhost:3004/api/sippar/elna';

  useEffect(() => {
    if (principal) {
      loadAgents();
      loadRevenue();
      loadTransactions();
    }
  }, [principal]);

  const loadAgents = async () => {
    try {
      const response = await fetch(`${API_BASE}/agents`);
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
        if (data.agents.length > 0) {
          setSelectedFromAgent(data.agents[0].id);
          setSelectedToAgent(data.agents[1]?.id || data.agents[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setMessage({ text: 'Failed to load agents', type: 'error' });
    }
  };

  const loadRevenue = async () => {
    try {
      const response = await fetch(`${API_BASE}/revenue`);
      const data = await response.json();
      if (data.success) {
        setRevenue({
          total: data.total_revenue,
          count: data.transaction_count
        });
      }
    } catch (error) {
      console.error('Error loading revenue:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions.slice(0, 5)); // Latest 5 transactions
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const calculateFee = (amount: number): number => {
    return Math.max(amount * 0.001, 0.001); // 0.1% with minimum of 0.001
  };

  const processPayment = async () => {
    if (!selectedFromAgent || !selectedToAgent || !amount || selectedFromAgent === selectedToAgent) {
      setMessage({ text: 'Please select different agents and enter a valid amount', type: 'error' });
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0 || paymentAmount > ckAlgoBalance) {
      setMessage({ text: 'Invalid amount or insufficient ckALGO balance', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_BASE}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_agent: selectedFromAgent,
          to_agent: selectedToAgent,
          amount: paymentAmount
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ text: `Payment successful! Transaction ID: ${result.transaction_id}`, type: 'success' });
        setAmount('');
        await loadRevenue();
        await loadTransactions();
      } else {
        setMessage({ text: `Payment failed: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `Network error: ${error}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getAgentName = (agentId: string): string => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.emoji} ${agent.name}` : agentId;
  };

  const fee = amount ? calculateFee(parseFloat(amount) || 0) : 0;
  const netAmount = amount ? (parseFloat(amount) || 0) - fee : 0;
  const progressPercentage = Math.min((revenue.total / 100) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🌉 Agent Payment Bridge</h2>
        <p className="opacity-90">Route payments between AI agents using your ckALGO balance</p>
      </div>

      {/* Current Balance Display */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">Your ckALGO Balance</span>
          <span className="text-2xl font-bold text-green-400">{ckAlgoBalance.toFixed(3)} ckALGO</span>
        </div>
        <div className="text-sm text-gray-400">
          Available for agent payments • Connected via Internet Identity
        </div>
      </div>

      {/* Revenue Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-sm text-gray-400 mb-1">Revenue Collected</div>
          <div className="text-xl font-bold text-green-400">{revenue.total.toFixed(3)} ckALGO</div>
          <div className="text-xs text-gray-500">~${revenue.total.toFixed(2)} USD</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-sm text-gray-400 mb-1">Total Transactions</div>
          <div className="text-xl font-bold text-blue-400">{revenue.count}</div>
          <div className="text-xs text-gray-500">Payments processed</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-sm text-gray-400 mb-1">Progress to $100</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">{progressPercentage.toFixed(1)}% complete</div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <h3 className="text-lg font-semibold mb-4 text-white">💸 Route Payment Between Agents</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">From Agent</label>
            <select
              value={selectedFromAgent}
              onChange={(e) => setSelectedFromAgent(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.emoji} {agent.name} - {agent.platform}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">To Agent</label>
            <select
              value={selectedToAgent}
              onChange={(e) => setSelectedToAgent(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.emoji} {agent.name} - {agent.platform}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Payment Amount (ckALGO)</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            max={ckAlgoBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount..."
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {amount && (
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Payment Breakdown</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Amount:</span>
                <span className="text-white">{parseFloat(amount).toFixed(3)} ckALGO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Routing Fee (0.1%):</span>
                <span className="text-orange-400">{fee.toFixed(3)} ckALGO</span>
              </div>
              <div className="flex justify-between border-t border-gray-600 pt-1">
                <span className="text-gray-300 font-medium">Net Amount:</span>
                <span className="text-green-400 font-medium">{netAmount.toFixed(3)} ckALGO</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={processPayment}
          disabled={isProcessing || !amount || selectedFromAgent === selectedToAgent}
          className="w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </div>
          ) : (
            '🚀 Route Payment'
          )}
        </button>

        {message.text && (
          <div className={`mt-4 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-500 text-green-400'
              : 'bg-red-900/30 border border-red-500 text-red-400'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <h3 className="text-lg font-semibold mb-4 text-white">📋 Recent Agent Payments</h3>

        {transactions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">💸</div>
            <p>No agent payments yet</p>
            <p className="text-sm">Route your first payment to see transaction history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">
                      {getAgentName(tx.from_agent)} → {getAgentName(tx.to_agent)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      tx.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">
                      {tx.amount.toFixed(3)} ckALGO
                    </div>
                    <div className="text-xs text-orange-400">
                      +{tx.fee.toFixed(3)} fee
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                  <span>ID: {tx.id.slice(0, 16)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Partner Platform Information */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <h3 className="text-lg font-semibold mb-4 text-white">🤝 Platform Integration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">💡 How It Works</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Connect with your existing ckALGO balance</li>
              <li>• Route payments between AI agents instantly</li>
              <li>• 0.1% routing fee supports the network</li>
              <li>• All payments use Internet Identity security</li>
            </ul>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">🌐 Platform Partners</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• ELNA.ai: {agents.filter(a => a.platform === 'ELNA.ai').length} agents</li>
              <li>• Integration ready for all platforms</li>
              <li>• Universal ckALGO payment acceptance</li>
              <li>• Seamless cross-platform agent hiring</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPayments;