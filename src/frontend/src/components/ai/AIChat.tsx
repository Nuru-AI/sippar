/**
 * AI Chat Component - Direct OpenWebUI Integration
 * 
 * This component integrates directly with the existing OpenWebUI interface
 * deployed on XNode2. It provides both embedded iframe and direct link options.
 */

import React, { useState, useEffect } from 'react';

interface AIStatus {
  available: boolean;
  endpoint: string;
  responseTime?: number;
}

const AIChat: React.FC = () => {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);

  // Load AI status on component mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await fetch('/api/sippar/api/ai/status');
      const data = await response.json();
      
      if (data.success && data.openwebui) {
        setAiStatus({
          available: data.openwebui.available,
          endpoint: data.openwebui.endpoint,
          responseTime: data.openwebui.responseTime
        });
      } else {
        setAiStatus({
          available: false,
          endpoint: 'unknown'
        });
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
      setAiStatus({
        available: false,
        endpoint: 'unknown'
      });
    }
  };

  const openOpenWebUI = () => {
    if (aiStatus?.available && aiStatus.endpoint) {
      window.open(aiStatus.endpoint, '_blank');
    }
  };

  if (showEmbedded) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🤖</div>
            <h3 className="text-lg font-semibold text-white">AI Assistant (Embedded)</h3>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={openOpenWebUI}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Open in New Tab
            </button>
            <button
              onClick={() => setShowEmbedded(false)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
            >
              Minimize
            </button>
          </div>
        </div>

        {/* Embedded OpenWebUI Interface */}
        <div className="relative">
          <iframe
            src={aiStatus?.endpoint || ''}
            className="w-full h-96 rounded border border-gray-600 bg-white"
            title="OpenWebUI Chat Interface"
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={openOpenWebUI}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded shadow-lg"
            >
              ↗ Open Full
            </button>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          <p>Direct OpenWebUI integration • Models: qwen2.5:0.5b, deepseek-r1, phi-3, mistral</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
            <p className="text-sm text-gray-400">
              Status: <span className={aiStatus?.available ? 'text-green-400' : 'text-red-400'}>
                {aiStatus?.available ? 'Online' : 'Offline'}
              </span>
              {aiStatus?.responseTime && (
                <span className="ml-2 text-gray-500">({aiStatus.responseTime}ms)</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              OpenWebUI with qwen2.5:0.5b, deepseek-r1, phi-3, mistral models
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={openOpenWebUI}
            disabled={!aiStatus?.available}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors font-medium"
          >
            🚀 Open AI Chat
          </button>
          <button
            onClick={() => setShowEmbedded(true)}
            disabled={!aiStatus?.available}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            📱 Embed
          </button>
        </div>
      </div>
      
      {!aiStatus?.available && (
        <div className="mt-3 p-3 bg-red-900 border border-red-600 rounded">
          <p className="text-red-200 text-sm">
            AI service is currently unavailable. Please try again later or contact support.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIChat;