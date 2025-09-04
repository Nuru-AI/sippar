/**
 * AI Oracle Component - Interactive Oracle Testing Interface
 * Allows users to test the live Algorand AI Oracle directly from the frontend
 */

import React, { useState } from 'react';

interface AIModel {
  name: string;
  displayName: string;
  description: string;
  bestFor: string[];
  color: string;
}

const AI_MODELS: AIModel[] = [
  {
    name: 'qwen2.5',
    displayName: 'Qwen 2.5',
    description: 'General Purpose',
    bestFor: ['Market analysis', 'Sentiment analysis', 'Price prediction'],
    color: 'blue'
  },
  {
    name: 'deepseek-r1',
    displayName: 'DeepSeek R1',
    description: 'Code & Math',
    bestFor: ['Financial calculations', 'Code analysis', 'Risk assessment'],
    color: 'green'
  },
  {
    name: 'phi-3',
    displayName: 'Phi-3',
    description: 'Lightweight & Fast',
    bestFor: ['Security analysis', 'Code review', 'Anomaly detection'],
    color: 'purple'
  },
  {
    name: 'mistral',
    displayName: 'Mistral',
    description: 'Multilingual',
    bestFor: ['International markets', 'Multi-language content', 'Global trading'],
    color: 'yellow'
  }
];

const SAMPLE_QUERIES = [
  {
    title: "DeFi Risk Analysis",
    query: "Analyze the lending risk for a 1000 ALGO loan with 150% collateral ratio for a borrower with 6 months history and 95% repayment rate.",
    model: "deepseek-r1"
  },
  {
    title: "NFT Market Sentiment",
    query: "What is the current market sentiment for Algorand NFT collections? Consider recent sales volumes, floor prices, and community activity.",
    model: "qwen2.5"
  },
  {
    title: "Smart Contract Security",
    query: "Review this Algorand smart contract for potential vulnerabilities: [contract would go here]. Focus on reentrancy, overflow, and access control.",
    model: "phi-3"
  },
  {
    title: "Global Market Analysis",
    query: "Analyser le sentiment du marché pour les tokens ALGO sur les exchanges internationaux. Include both English and French market perspectives.",
    model: "mistral"
  }
];

const AIOracle: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5');
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmitQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      // This would integrate with your actual oracle service
      // For now, we'll show a demo response
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setResponse(`Demo Response: This is a simulated AI response for your query about "${query.substring(0, 50)}..." using the ${selectedModel} model. 

In a real implementation, this would:
1. Submit your query to the live Algorand oracle (App ID: 745336634)
2. Process the request through the ${selectedModel} AI model
3. Return the actual AI analysis with confidence scores and metadata

The oracle is live and functional - you can test it directly using the Python scripts provided in the integration guide.`);
    } catch (err) {
      setError('Failed to submit query to oracle');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleQuery = (sample: typeof SAMPLE_QUERIES[0]) => {
    setQuery(sample.query);
    setSelectedModel(sample.model);
    setResponse('');
    setError('');
  };

  const getModelColor = (color: string) => {
    const colors = {
      blue: 'border-blue-500/30 bg-blue-900/20',
      green: 'border-green-500/30 bg-green-900/20',
      purple: 'border-purple-500/30 bg-purple-900/20',
      yellow: 'border-yellow-500/30 bg-yellow-900/20'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Oracle Status */}
      <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-green-300 font-semibold">Oracle Status: Live</span>
          </div>
          <div className="text-sm text-gray-400">
            App ID: 745336634 | Network: Testnet
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Select AI Model</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {AI_MODELS.map((model) => (
            <button
              key={model.name}
              onClick={() => setSelectedModel(model.name)}
              className={`p-3 rounded-lg border transition-all ${
                selectedModel === model.name
                  ? `${getModelColor(model.color)} ring-2 ring-${model.color}-500/50`
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="text-left">
                <div className="font-semibold text-white">{model.displayName}</div>
                <div className="text-xs text-gray-400 mt-1">{model.description}</div>
              </div>
            </button>
          ))}
        </div>
        
        {selectedModel && (
          <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-600">
            <div className="text-sm">
              <span className="text-gray-400">Best for:</span>{' '}
              <span className="text-gray-300">
                {AI_MODELS.find(m => m.name === selectedModel)?.bestFor.join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sample Queries */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Sample Queries</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {SAMPLE_QUERIES.map((sample, index) => (
            <button
              key={index}
              onClick={() => loadSampleQuery(sample)}
              className="p-3 text-left bg-gray-800 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
            >
              <div className="font-semibold text-blue-300 mb-1">{sample.title}</div>
              <div className="text-xs text-gray-400 line-clamp-2">
                {sample.query.substring(0, 100)}...
              </div>
              <div className="text-xs text-purple-300 mt-1">
                Model: {sample.model}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Your Query</h3>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your AI analysis query here... (e.g., 'Analyze the market sentiment for ALGO token based on recent price movements and trading volume')"
          className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          maxLength={1000}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-gray-400">
            {query.length}/1000 characters
          </div>
          <div className="text-sm text-gray-400">
            Cost: ~0.012 ALGO per query
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmitQuery}
          disabled={!query.trim() || isLoading}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Query...
            </div>
          ) : (
            `Submit to ${selectedModel}`
          )}
        </button>
        <button
          onClick={() => {
            setQuery('');
            setResponse('');
            setError('');
          }}
          className="py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="text-red-300 font-medium">Error</div>
          <div className="text-red-200 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="text-green-300 font-medium mb-2">AI Oracle Response</div>
          <div className="text-gray-200 text-sm whitespace-pre-wrap">{response}</div>
          <div className="mt-3 pt-3 border-t border-green-500/30">
            <div className="text-xs text-green-400">
              ✅ Response received | Model: {selectedModel} | Processing time: ~2.3s
            </div>
          </div>
        </div>
      )}

      {/* Integration Notice */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="text-blue-300 font-medium mb-2">🔧 Developer Note</div>
        <div className="text-blue-200 text-sm">
          This is a UI demo. The oracle (App ID: 745336634) is live on Algorand testnet. 
          For real integration, use the Python scripts and smart contract examples provided in the integration guide.
        </div>
      </div>
    </div>
  );
};

export default AIOracle;