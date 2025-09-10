// ckALGO SDK AI Service
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { 
  AIServiceType, 
  AIRequest, 
  AIResponse, 
  AIServiceHealth,
  SDKResponse,
  PaginatedResponse,
  UserTier
} from '../types';

export class AIService {
  private client: any; // SipparClient reference

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Query AI service with a prompt
   */
  async query(request: AIRequest): Promise<SDKResponse<AIResponse>> {
    try {
      // Check authentication
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      // Check authorization for AI service
      const authCheck = await this.client.getAuth().checkAuthorization('ai.basic_query');
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: authCheck.error || 'Not authorized for AI queries',
          timestamp: Date.now()
        };
      }

      // Validate request
      if (!request.query || request.query.trim().length === 0) {
        return {
          success: false,
          error: 'Query text is required',
          timestamp: Date.now()
        };
      }

      // Get canister actor
      const actor = await this.client.getCanisterActor();

      // Prepare AI request based on service type
      let result;
      switch (request.serviceType) {
        case AIServiceType.AlgorandOracle:
          result = await actor.process_ai_request(
            { AlgorandOracle: null },
            request.query,
            request.model ? [request.model] : []
          );
          break;

        case AIServiceType.OpenWebUIChat:
          result = await actor.process_ai_request(
            { OpenWebUIChat: null },
            request.query,
            request.model ? [request.model] : []
          );
          break;

        default:
          return {
            success: false,
            error: `Unsupported AI service type: ${request.serviceType}`,
            timestamp: Date.now()
          };
      }

      // Parse result
      if ('Ok' in result) {
        const response = result.Ok;
        return {
          success: true,
          data: {
            requestId: response.request_id,
            response: response.response,
            confidence: response.confidence?.[0],
            modelUsed: response.model_used,
            tokensUsed: Number(response.tokens_used || 0),
            costInCkALGO: response.cost_in_ck_algo?.toString() || '0',
            timestamp: Number(response.timestamp),
            metadata: response.metadata || {}
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'AI query failed',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI query failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get AI service health status
   */
  async getServiceHealth(serviceType: AIServiceType): Promise<SDKResponse<AIServiceHealth>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.get_ai_service_health(serviceType);

      if (result.length > 0) {
        const health = result[0];
        return {
          success: true,
          data: {
            serviceType,
            status: health.status,
            responseTime: Number(health.response_time_ms),
            successRate: Number(health.success_rate),
            lastChecked: Number(health.last_checked)
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'Service health data not available',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get service health',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get available AI models for a service
   */
  async getAvailableModels(serviceType: AIServiceType): Promise<SDKResponse<string[]>> {
    try {
      const actor = await this.client.getCanisterActor();
      const config = await actor.get_ai_service_config(serviceType);

      if (config.length > 0) {
        return {
          success: true,
          data: config[0].supported_models,
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'Service configuration not found',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available models',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get AI query history for the current user
   */
  async getQueryHistory(page: number = 1, pageSize: number = 10): Promise<SDKResponse<PaginatedResponse<AIResponse>>> {
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
      
      // Get user's AI request history
      const result = await actor.get_user_ai_history(principal, page - 1, pageSize);

      const items = result.requests.map((req: any) => ({
        requestId: req.request_id,
        response: req.response || '',
        confidence: req.confidence?.[0],
        modelUsed: req.model_used || 'unknown',
        tokensUsed: Number(req.tokens_used || 0),
        costInCkALGO: req.cost_in_ck_algo?.toString() || '0',
        timestamp: Number(req.timestamp),
        metadata: req.metadata || {}
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
        error: error instanceof Error ? error.message : 'Failed to get query history',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Calculate cost for an AI query
   */
  async calculateQueryCost(
    serviceType: AIServiceType, 
    estimatedTokens: number,
    model?: string
  ): Promise<SDKResponse<string>> {
    try {
      const actor = await this.client.getCanisterActor();
      const userTier = this.client.getCurrentUser()?.tier || UserTier.Free;
      
      const result = await actor.calculate_ai_service_fee(
        serviceType,
        estimatedTokens,
        model ? [model] : [],
        userTier
      );

      return {
        success: true,
        data: result.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate cost',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Batch AI queries (for Professional/Enterprise users)
   */
  async batchQuery(requests: AIRequest[]): Promise<SDKResponse<AIResponse[]>> {
    try {
      // Check authorization for batch processing
      const authCheck = await this.client.getAuth().checkAuthorization(
        'ai.batch_processing', 
        UserTier.Professional
      );
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: 'Batch processing requires Professional tier or higher',
          timestamp: Date.now()
        };
      }

      // Process each request
      const responses: AIResponse[] = [];
      const errors: string[] = [];

      for (let i = 0; i < requests.length; i++) {
        const result = await this.query(requests[i]);
        if (result.success && result.data) {
          responses.push(result.data);
        } else {
          errors.push(`Request ${i + 1}: ${result.error}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `Batch processing failed: ${errors.join('; ')}`,
          timestamp: Date.now()
        };
      }

      return {
        success: true,
        data: responses,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch query failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get AI service usage statistics
   */
  async getUsageStats(): Promise<SDKResponse<{
    totalQueries: number;
    totalCost: string;
    averageCost: string;
    favoriteModel: string;
    monthlyUsage: Array<{ month: string; queries: number; cost: string }>;
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
      
      const stats = await actor.get_user_ai_usage_stats(principal);

      return {
        success: true,
        data: {
          totalQueries: Number(stats.total_queries),
          totalCost: stats.total_cost.toString(),
          averageCost: stats.average_cost.toString(),
          favoriteModel: stats.favorite_model,
          monthlyUsage: stats.monthly_usage.map((month: any) => ({
            month: month.month,
            queries: Number(month.queries),
            cost: month.cost.toString()
          }))
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage stats',
        timestamp: Date.now()
      };
    }
  }
}