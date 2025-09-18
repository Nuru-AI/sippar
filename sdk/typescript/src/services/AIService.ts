import { AxiosInstance } from 'axios';
import { SipparConfig } from '../types/common';
import { AIQuery, AIResponse, AIServiceType, ChatAuthRequest, ChatAuthResponse } from '../types/ai';
import { SipparError, ErrorCode } from '../utils/errors';

/**
 * AI Service for Sippar Platform
 * Provides access to AI Oracle, OpenWebUI Chat, and Enhanced AI services
 */
export class AIService {
  constructor(
    private httpClient: AxiosInstance,
    private config: SipparConfig
  ) {}

  /**
   * Basic AI Query - General purpose AI responses
   */
  async query(request: AIQuery): Promise<AIResponse> {
    try {
      const response = await this.httpClient.post('/api/sippar/ai/query', {
        query: request.query,
        userPrincipal: request.userPrincipal,
        serviceType: request.serviceType || 'general'
      });

      return {
        success: response.data.success,
        data: response.data.data,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      throw new SipparError(
        ErrorCode.AI_QUERY_FAILED,
        `AI query failed: ${error}`
      );
    }
  }

  /**
   * AI Oracle Query - Algorand-specific AI oracle integration
   */
  async oracleQuery(request: AIQuery): Promise<AIResponse> {
    try {
      const response = await this.httpClient.post('/api/v1/ai-oracle/query', {
        query: request.query,
        userPrincipal: request.userPrincipal,
        algorandData: request.algorandData || {}
      });

      return {
        success: response.data.success,
        data: {
          ...response.data.data,
          appId: 745336394 // Algorand AI Oracle App ID
        },
        timestamp: response.data.timestamp
      };
    } catch (error) {
      throw new SipparError(
        ErrorCode.AI_ORACLE_FAILED,
        `AI Oracle query failed: ${error}`
      );
    }
  }

  /**
   * Enhanced AI Query - Premium features with caching
   */
  async enhancedQuery(request: AIQuery & { cacheEnabled?: boolean }): Promise<AIResponse> {
    try {
      const response = await this.httpClient.post('/api/sippar/ai/enhanced-query', {
        query: request.query,
        userPrincipal: request.userPrincipal,
        serviceType: request.serviceType || 'enhanced',
        cacheEnabled: request.cacheEnabled !== false
      });

      return {
        success: response.data.success,
        data: response.data.data,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      throw new SipparError(
        ErrorCode.AI_ENHANCED_FAILED,
        `Enhanced AI query failed: ${error}`
      );
    }
  }

  /**
   * Get Chat Authentication URL for OpenWebUI
   */
  async getChatAuth(request: ChatAuthRequest): Promise<ChatAuthResponse> {
    try {
      const response = await this.httpClient.post('/api/sippar/ai/chat-auth', {
        userPrincipal: request.userPrincipal,
        algorandAddress: request.algorandAddress
      });

      return {
        success: response.data.success,
        authUrl: response.data.data.authUrl,
        expires: response.data.data.expires,
        models: response.data.data.models || []
      };
    } catch (error) {
      throw new SipparError(
        ErrorCode.AI_CHAT_AUTH_FAILED,
        `Chat authentication failed: ${error}`
      );
    }
  }

  /**
   * Get AI Service Health Status
   */
  async getHealth() {
    try {
      const response = await this.httpClient.get('/api/sippar/ai/health');
      return response.data;
    } catch (error) {
      throw new SipparError(
        ErrorCode.AI_HEALTH_FAILED,
        `AI health check failed: ${error}`
      );
    }
  }

  /**
   * Get AI Oracle Health Status
   */
  async getOracleHealth() {
    try {
      const response = await this.httpClient.get('/api/v1/ai-oracle/health');
      return response.data;
    } catch (error) {
      throw new SipparError(
        ErrorCode.AI_ORACLE_HEALTH_FAILED,
        `AI Oracle health check failed: ${error}`
      );
    }
  }
}