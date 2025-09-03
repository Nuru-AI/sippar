/**
 * Main Sippar Application Component
 * Simple Phase 1 implementation with Internet Identity authentication
 */

import { useAlgorandIdentity } from './hooks/useAlgorandIdentity';
import LoginComponent from './components/LoginComponent';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const { isAuthenticated, isLoading, error } = useAlgorandIdentity();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Sippar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                🌉 Sippar
              </h1>
              <span className="ml-3 text-sm text-gray-400">
                Algorand Chain Fusion Bridge
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Phase 1 - Foundation
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-400">
                  {error.code === 'CHAIN_FUSION_NOT_READY' ? 'Phase 1 Mode' : 'Notice'}
                </h3>
                <div className="mt-2 text-sm text-yellow-300">
                  {error.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isAuthenticated ? (
          <LoginComponent />
        ) : (
          <Dashboard />
        )}
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              Sippar v1.0.0-alpha - Algorand Chain Fusion Bridge
            </div>
            <div className="flex items-center space-x-4">
              <span>Sister Project to Rabbi Trading Bot</span>
              <span>•</span>
              <span>Powered by Internet Computer</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;