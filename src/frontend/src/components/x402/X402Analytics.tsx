/**
 * X402 Analytics Dashboard Component
 * Displays payment metrics and service usage analytics
 */

import React, { useState, useEffect } from 'react';

interface X402Metrics {
  totalPayments: number;
  totalRevenue: number;
  averagePaymentAmount: number;
  successRate: number;
  topServices: Array<{
    endpoint: string;
    payments: number;
    revenue: number;
  }>;
}

interface PaymentHistoryItem {
  timestamp: string;
  amount: number;
  service: string;
  status: string;
  principal: string;
}

interface X402AnalyticsData {
  metrics: X402Metrics;
  recentPayments: PaymentHistoryItem[];
  timestamp: string;
}

export const X402Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<X402AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAnalyticsData();

    // Refresh analytics every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch('/api/sippar/x402/analytics');
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.analytics);
        setError('');
      } else {
        throw new Error(result.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Analytics</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">No analytics data available</div>
      </div>
    );
  }

  const { metrics, recentPayments } = analyticsData;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">X402 Payment Analytics</h2>
        <p className="text-gray-600">
          Micropayment metrics and service usage insights
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Last updated: {formatDate(analyticsData.timestamp)}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Payments</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalPayments.toLocaleString()}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Average Payment</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.averagePaymentAmount)}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Success Rate</h3>
          <p className="text-2xl font-bold text-purple-600">{(metrics.successRate * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services by Revenue</h3>

          {metrics.topServices.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No service data available yet
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.topServices.map((service, index) => (
                <div key={service.endpoint} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {service.endpoint.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {service.payments} payments
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(service.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>

          {recentPayments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No recent payments
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {payment.service.split('/').pop()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(payment.timestamp)}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {payment.principal.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="flex flex-col items-end ml-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </span>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Protocol Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">X402 Protocol Benefits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800">Instant Settlement</h4>
            <p className="text-blue-700">Payments settle in under 2 seconds</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">Micro-Precision</h4>
            <p className="text-blue-700">Pay as little as $0.001 per request</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">Zero Lock-in</h4>
            <p className="text-blue-700">Pay-per-use with no subscriptions</p>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchAnalyticsData}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
};