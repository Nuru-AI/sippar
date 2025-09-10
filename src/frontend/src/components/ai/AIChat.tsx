/**
 * AI Chat Component - Direct OpenWebUI Integration
 * 
 * This component integrates directly with the existing OpenWebUI interface
 * deployed on XNode2. It provides both embedded iframe and direct link options.
 */

import React, { useState, useEffect } from 'react';
import { AuthUser, AlgorandChainFusionCredentials } from '../../hooks/useAlgorandIdentity';
import { useAuthStore } from '../../stores/authStore'; // ✅ ADDED: Direct store access

interface AIStatus {
  available: boolean;
  endpoint: string;
  responseTime?: number;
}

// ✅ REMOVED: Props interface - now using store directly
// interface AIChatProps {
//   user: AuthUser | null;
//   credentials: AlgorandChainFusionCredentials | null;
// }

const AIChat: React.FC = () => {
  // ✅ MIGRATED: Use store instead of props
  const user = useAuthStore(state => state.user);
  const credentials = useAuthStore(state => state.credentials);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Load AI status only when authenticated
  useEffect(() => {
    if (user?.isAuthenticated) {
      checkAIStatus();
    }
  }, [user?.isAuthenticated]);

  // Get authenticated URL when user changes
  useEffect(() => {
    if (user?.isAuthenticated && user?.principal && credentials?.algorandAddress) {
      getAuthenticatedUrl();
    }
  }, [user, credentials]);

  const checkAIStatus = async () => {
    try {
      const response = await fetch('https://nuru.network/api/ai/status');
      if (!response.ok) {
        throw new Error(`AI status endpoint not available (${response.status})`);
      }
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
      // Silently handle missing AI endpoints - they're optional features
      console.log('AI integration not available - continuing without AI features');
      setAiStatus({
        available: false,
        endpoint: 'unknown'
      });
    }
  };

  const getAuthenticatedUrl = async () => {
    setAuthLoading(true);
    try {
      const response = await fetch('https://nuru.network/api/ai/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrincipal: user?.principal,
          algorandAddress: credentials?.algorandAddress,
          authSignature: credentials?.signature
        })
      });

      if (!response.ok) {
        throw new Error(`AI auth endpoint not available (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setAuthUrl(data.authUrl);
      } else {
        console.log('AI authentication not configured');
        setAuthUrl(null);
      }
    } catch (error) {
      // Silently handle missing AI auth endpoint - it's optional
      console.log('AI authentication not available - continuing without AI auth');
      setAuthUrl(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const openOpenWebUI = () => {
    if (authUrl) {
      window.open(authUrl, '_blank');
    } else if (aiStatus?.endpoint) {
      // Fallback to direct URL if authenticated URL not available
      window.open(aiStatus.endpoint, '_blank');
    }
  };

  // Don't render AI chat if AI services are confirmed unavailable
  if (aiStatus !== null && !aiStatus.available) {
    return null;
  }

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
          {authLoading ? (
            <div className="w-full h-96 rounded border border-gray-600 bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading authenticated chat...</p>
              </div>
            </div>
          ) : (
            <iframe
              src={authUrl || aiStatus?.endpoint || ''}
              className="w-full h-96 rounded border border-gray-600 bg-white"
              title="OpenWebUI Chat Interface"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          )}
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
          {user?.principal && (
            <p className="text-green-400 mt-1">✅ Authenticated as {credentials?.algorandAddress?.slice(0, 8)}...{credentials?.algorandAddress?.slice(-6)}</p>
          )}
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
            {user?.principal && (
              <p className="text-xs text-green-400 mt-1">✅ Authenticated as {credentials?.algorandAddress?.slice(0, 8)}...{credentials?.algorandAddress?.slice(-6)}</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={openOpenWebUI}
            disabled={!aiStatus?.available || !user?.principal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors font-medium"
          >
            🚀 Open AI Chat
          </button>
          <button
            onClick={() => setShowEmbedded(true)}
            disabled={!aiStatus?.available || !user?.principal}
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
      
      {!user?.principal && (
        <div className="mt-3 p-3 bg-yellow-900 border border-yellow-600 rounded">
          <p className="text-yellow-200 text-sm">
            Please authenticate with Internet Identity to access AI chat features.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIChat;