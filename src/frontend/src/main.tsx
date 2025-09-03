/**
 * Sippar Frontend Entry Point
 * React 18 with StrictMode for development
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('💥 Global JavaScript Error:', event.error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace; color: red; background: #fff;">
      <h2>🚨 Sippar Frontend Error</h2>
      <p><strong>Error:</strong> ${event.error?.message || 'Unknown error'}</p>
      <p><strong>File:</strong> ${event.filename}:${event.lineno}</p>
      <details>
        <summary>Stack trace</summary>
        <pre>${event.error?.stack || 'No stack trace'}</pre>
      </details>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled Promise Rejection:', event.reason);
});

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('💥 React Initialization Failed:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace; color: red; background: #fff;">
      <h2>🚨 React Initialization Failed</h2>
      <p><strong>Error:</strong> ${error}</p>
    </div>
  `;
}