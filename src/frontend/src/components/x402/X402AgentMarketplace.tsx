/**
 * X402 Agent Marketplace Component
 * Displays available AI services with X402 micropayment integration
 */

import React, { useState, useEffect } from 'react';
import { X402PaymentModal } from './X402PaymentModal';

interface MarketplaceService {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  endpoint: string;
}

interface X402MarketplaceData {
  services: MarketplaceService[];
  totalServices: number;
  timestamp: string;
}

export const X402AgentMarketplace: React.FC = () => {
  const [marketplaceData, setMarketplaceData] = useState<X402MarketplaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const fetchMarketplaceData = async () => {
    try {
      const response = await fetch('/api/sippar/x402/agent-marketplace');
      const result = await response.json();

      if (result.success) {
        setMarketplaceData(result.marketplace);
      } else {
        throw new Error(result.error || 'Failed to fetch marketplace data');
      }
    } catch (error) {
      console.error('Failed to fetch marketplace:', error);
      setError(error instanceof Error ? error.message : 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: MarketplaceService) => {
    setSelectedService(service);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentData: any) => {
    setLastPayment(paymentData);
    setShowPaymentModal(false);
    setSelectedService(null);

    // Here you could trigger the actual service call
    console.log('Payment successful, service access granted:', paymentData);
  };

  const handlePaymentFailure = (error: string) => {
    console.error('Payment failed:', error);
    // Payment modal will handle error display
  };

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case 'ai-oracle-basic':
        return '🤖';
      case 'ai-oracle-enhanced':
        return '⚡';
      case 'ckALGO-mint':
        return '🪙';
      case 'ckALGO-redeem':
        return '💰';
      default:
        return '🔧';
    }
  };

  const getServiceCategory = (serviceId: string) => {
    if (serviceId.includes('ai-oracle')) return 'AI Services';
    if (serviceId.includes('ckALGO')) return 'DeFi Services';
    return 'Other Services';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Marketplace</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchMarketplaceData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">X402 Agent Marketplace</h2>
        <p className="text-gray-600">
          Pay-per-use AI services and DeFi operations with instant micropayments
        </p>
        {marketplaceData && (
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span>{marketplaceData.totalServices} services available</span>
            <span className="mx-2">•</span>
            <span>Last updated: {new Date(marketplaceData.timestamp).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Payment Success Banner */}
      {lastPayment && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-600 text-xl mr-3">✅</span>
            <div>
              <h3 className="text-green-800 font-semibold">Payment Successful</h3>
              <p className="text-green-700 text-sm">
                Service access granted. Transaction ID: {lastPayment.transactionId}
              </p>
            </div>
            <button
              onClick={() => setLastPayment(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {marketplaceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketplaceData.services.map((service) => (
            <div
              key={service.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleServiceSelect(service)}
            >
              {/* Service Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{getServiceIcon(service.id)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {getServiceCategory(service.id)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {service.description}
              </p>

              {/* Service Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Price:</span>
                  <span className="font-semibold text-blue-600">
                    ${service.price.toFixed(3)} {service.currency}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Endpoint:</span>
                  <span className="font-mono text-xs text-gray-700">
                    {service.endpoint.split('/').pop()}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Use Service - ${service.price.toFixed(3)}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* X402 Payment Modal */}
      {selectedService && (
        <X402PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedService(null);
          }}
          service={selectedService}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      )}

      {/* Footer Info */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About X402 Protocol</h3>
          <p className="text-blue-800 text-sm">
            X402 enables instant micropayments for AI services and blockchain operations.
            Pay only for what you use with sub-cent precision and instant settlement.
          </p>
          <div className="mt-3 flex items-center text-xs text-blue-700">
            <span>🔒 Secure</span>
            <span className="mx-3">⚡ Instant</span>
            <span>💰 Low Cost</span>
            <span className="mx-3">🤖 AI-Native</span>
          </div>
        </div>
      </div>
    </div>
  );
};