/**
 * X402 Payment Modal Component
 * Handles micropayment flows for AI services and ckALGO operations
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface X402PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    endpoint: string;
  };
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentFailure: (error: string) => void;
}

export const X402PaymentModal: React.FC<X402PaymentModalProps> = ({
  isOpen,
  onClose,
  service,
  onPaymentSuccess,
  onPaymentFailure
}) => {
  const { user, credentials } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [serviceToken, setServiceToken] = useState<string>('');
  const [showServiceInterface, setShowServiceInterface] = useState(false);
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isUsingService, setIsUsingService] = useState(false);

  const handlePayment = async () => {
    if (!user?.principal) {
      onPaymentFailure('User not authenticated');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      // Create X402 payment request
      const paymentRequest = {
        service: service.id,
        amount: service.price,
        principal: user.principal,
        algorandAddress: credentials?.algorandAddress || '',
        aiModel: 'default',
        metadata: {
          requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          serviceEndpoint: service.endpoint
        }
      };

      const response = await fetch('https://nuru.network/api/sippar/x402/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest)
      });

      const result = await response.json();

      if (result.success) {
        setPaymentStatus('success');
        setServiceToken(result.payment.serviceToken || result.payment.accessToken || '');
        onPaymentSuccess(result.payment);
      } else {
        throw new Error(result.error || 'Payment creation failed');
      }

    } catch (error) {
      console.error('X402 payment failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Payment failed';
      setErrorMessage(errorMsg);
      setPaymentStatus('failed');
      onPaymentFailure(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseService = async () => {
    if (!serviceToken || !aiQuery.trim()) {
      setErrorMessage('Please enter a query to use the AI service');
      return;
    }

    setIsUsingService(true);
    setAiResponse('');

    try {
      const response = await fetch(`https://nuru.network${service.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceToken}`,
          'X-Service-Token': serviceToken
        },
        body: JSON.stringify({
          query: aiQuery,
          model: 'deepseek-r1'
        })
      });

      const result = await response.json();

      if (result.success) {
        setAiResponse(result.ai_response || result.response || 'Service completed successfully');
      } else {
        throw new Error(result.error || 'Service request failed');
      }
    } catch (error) {
      console.error('Service usage failed:', error);
      setAiResponse(`Error: ${error instanceof Error ? error.message : 'Service request failed'}`);
    } finally {
      setIsUsingService(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing && !isUsingService) {
      setPaymentStatus('idle');
      setErrorMessage('');
      setShowServiceInterface(false);
      setAiQuery('');
      setAiResponse('');
      setServiceToken('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">X402 Payment Required</h2>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Service Information */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
          <p className="text-gray-600 text-sm mb-3">{service.description}</p>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Payment Amount:</span>
              <span className="font-bold text-blue-600">
                ${service.price.toFixed(3)} {service.currency}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-600">Service:</span>
              <span className="text-sm text-gray-900">{service.endpoint}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'processing' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              <span className="text-yellow-700">Processing payment...</span>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && !showServiceInterface && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-700">✅ Payment successful! Service access granted.</span>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && showServiceInterface && (
          <div className="mb-4 space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-blue-800 font-semibold mb-2">🤖 Use Your AI Service</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ask the AI anything:
                  </label>
                  <textarea
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="What would you like to know? (e.g., 'Explain blockchain technology')"
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleUseService}
                  disabled={isUsingService || !aiQuery.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUsingService ? 'Processing...' : '🚀 Ask AI'}
                </button>

                {aiResponse && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">AI Response:</h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{aiResponse}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-700">❌ Payment failed: {errorMessage}</span>
            </div>
          </div>
        )}

        {/* User Information */}
        {user && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <div className="mb-1">
                <span className="text-gray-600">Principal:</span>
                <span className="ml-2 font-mono text-xs">{user.principal}</span>
              </div>
              {credentials?.algorandAddress && (
                <div>
                  <span className="text-gray-600">Algorand Address:</span>
                  <span className="ml-2 font-mono text-xs">{credentials.algorandAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {paymentStatus === 'idle' && (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isProcessing || !user?.principal}
              >
                Pay ${service.price.toFixed(3)}
              </button>
            </>
          )}

          {paymentStatus === 'success' && !showServiceInterface && (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => setShowServiceInterface(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                🚀 Use Service
              </button>
            </div>
          )}

          {paymentStatus === 'success' && showServiceInterface && (
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          )}

          {paymentStatus === 'failed' && (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry Payment
              </button>
            </>
          )}
        </div>

        {/* Payment Protocol Info */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Powered by <span className="font-semibold">X402 Protocol</span> -
            Secure micropayments for AI services
          </p>
        </div>
      </div>
    </div>
  );
};