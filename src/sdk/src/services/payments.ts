// ckALGO SDK Payments Service
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { 
  PaymentRecord,
  RevenueMetrics,
  UserAccount,
  UserTier,
  SDKResponse,
  PaginatedResponse
} from '../types';

export interface PaymentRequest {
  serviceType: string;
  amount: string;
  metadata?: Record<string, any>;
}

export class PaymentService {
  private client: any; // SipparClient reference

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Process a payment for services
   */
  async processPayment(request: PaymentRequest): Promise<SDKResponse<PaymentRecord>> {
    try {
      // Check authentication
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      // Validate request
      if (!request.serviceType || !request.amount) {
        return {
          success: false,
          error: 'Service type and amount are required',
          timestamp: Date.now()
        };
      }

      // Get canister actor
      const actor = await this.client.getCanisterActor();
      const principal = this.client.getAuth().getPrincipal()!;

      const usageMetrics = {
        requests_count: 1,
        data_processed: BigInt(request.metadata?.dataSize || 0),
        compute_time_ms: BigInt(request.metadata?.computeTime || 0),
        additional_params: request.metadata || {}
      };

      const result = await actor.process_service_payment(
        principal,
        request.serviceType,
        usageMetrics
      );

      if ('Ok' in result) {
        const payment = result.Ok;
        return {
          success: true,
          data: {
            paymentId: payment.payment_id,
            payer: payment.payer,
            serviceType: payment.service_type,
            amount: payment.amount.toString(),
            timestamp: Number(payment.timestamp),
            status: payment.status || 'Completed',
            transactionDetails: payment.transaction_details || {}
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Payment processing failed',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get payment history for the current user
   */
  async getPaymentHistory(
    page: number = 1, 
    pageSize: number = 10
  ): Promise<SDKResponse<PaginatedResponse<PaymentRecord>>> {
    try {
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const principal = this.client.getAuth().getPrincipal()!;
      
      const result = await actor.get_payment_history(principal, page - 1, pageSize);

      const items = result.payments.map((payment: any) => ({
        paymentId: payment.payment_id,
        payer: payment.payer,
        serviceType: payment.service_type,
        amount: payment.amount.toString(),
        timestamp: Number(payment.timestamp),
        status: payment.status || 'Completed',
        transactionDetails: payment.transaction_details || {}
      }));

      return {
        success: true,
        data: {
          items,
          total: Number(result.total_count),
          page,
          pageSize,
          hasMore: result.has_more
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment history',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Calculate service fee
   */
  async calculateFee(
    serviceType: string,
    usageMetrics: {
      requestsCount?: number;
      dataSize?: number;
      computeTime?: number;
      additionalParams?: Record<string, any>;
    }
  ): Promise<SDKResponse<string>> {
    try {
      const actor = await this.client.getCanisterActor();
      const principal = this.client.getAuth().getPrincipal()!;

      const metrics = {
        requests_count: usageMetrics.requestsCount || 1,
        data_processed: BigInt(usageMetrics.dataSize || 0),
        compute_time_ms: BigInt(usageMetrics.computeTime || 0),
        additional_params: usageMetrics.additionalParams || {}
      };

      const result = await actor.calculate_service_fee(
        serviceType,
        metrics,
        principal
      );

      return {
        success: true,
        data: result.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate fee',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get user account information
   */
  async getUserAccount(): Promise<SDKResponse<UserAccount>> {
    try {
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const principal = this.client.getAuth().getPrincipal()!;
      
      const result = await actor.get_user_account(principal);

      if (result.length > 0) {
        const account = result[0];
        return {
          success: true,
          data: {
            principal: account.principal,
            tier: account.tier as UserTier,
            balance: account.balance.toString(),
            totalSpent: account.total_spent.toString(),
            joinedAt: Number(account.joined_at),
            lastActivity: Number(account.last_activity),
            preferences: account.preferences || {}
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'User account not found',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user account',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get revenue metrics (for Enterprise users)
   */
  async getRevenueMetrics(): Promise<SDKResponse<RevenueMetrics>> {
    try {
      // Check authorization
      const authCheck = await this.client.getAuth().checkAuthorization(
        'revenue.view',
        UserTier.Professional
      );
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: 'Revenue metrics require Professional tier or higher',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const result = await actor.get_revenue_metrics();

      return {
        success: true,
        data: {
          totalRevenue: result.total_revenue.toString(),
          monthlyRevenue: result.monthly_revenue.toString(),
          revenueByService: Object.fromEntries(
            Object.entries(result.revenue_by_service).map(([key, value]: [string, any]) => [
              key,
              value.toString()
            ])
          ),
          totalTransactions: Number(result.total_transactions),
          activeUsers: Number(result.active_users),
          averageTransactionValue: result.average_transaction_value?.toString() || '0'
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get revenue metrics',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Request payment refund
   */
  async requestRefund(paymentId: string, reason: string): Promise<SDKResponse<string>> {
    try {
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const result = await actor.request_payment_refund(paymentId, reason);

      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok,
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Refund request failed',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund request failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get spending analytics
   */
  async getSpendingAnalytics(periodDays: number = 30): Promise<SDKResponse<{
    totalSpent: string;
    spendingByService: Record<string, string>;
    dailySpending: Array<{ date: string; amount: string }>;
    averageDailySpend: string;
    topServices: Array<{ service: string; amount: string; percentage: number }>;
  }>> {
    try {
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const principal = this.client.getAuth().getPrincipal()!;
      
      const result = await actor.get_user_spending_analytics(principal, periodDays);

      return {
        success: true,
        data: {
          totalSpent: result.total_spent.toString(),
          spendingByService: Object.fromEntries(
            Object.entries(result.spending_by_service).map(([key, value]: [string, any]) => [
              key,
              value.toString()
            ])
          ),
          dailySpending: result.daily_spending.map((day: any) => ({
            date: day.date,
            amount: day.amount.toString()
          })),
          averageDailySpend: result.average_daily_spend.toString(),
          topServices: result.top_services.map((service: any) => ({
            service: service.service_name,
            amount: service.amount.toString(),
            percentage: Number(service.percentage)
          }))
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get spending analytics',
        timestamp: Date.now()
      };
    }
  }
}