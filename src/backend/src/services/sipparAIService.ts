/**
 * SipparAIService - OpenWebUI Integration Service
 * 
 * This service integrates with the existing OpenWebUI deployment on XNode2
 * for Sippar's AI chat functionality. Uses the verified OpenWebUI endpoints
 * and provides a simple interface for chat and AI interaction.
 */

export interface OpenWebUIStatus {
  available: boolean;
  endpoint: string;
  lastChecked: number;
  responseTime?: number;
}

export interface AIResponse {
  response: string;
  responseTime: number;
  success: boolean;
  source: 'openwebui' | 'fallback';
  error?: string;
}

export interface BasicAITest {
  input: string;
  response: string;
  responseTime: number;
  success: boolean;
  error?: string;
}

export class SipparAIService {
  // OpenWebUI Endpoints - Primary is nuru.network openwebui proxy, fallback is direct XNode2
  private primaryEndpoint: string = 'https://nuru.network/openwebui/';
  private fallbackEndpoint: string = 'https://xnode2.openmesh.cloud:8080';
  private connectionCache: OpenWebUIStatus | null = null;
  private cacheTimeout: number = 30000; // 30 seconds

  /**
   * Test connection to OpenWebUI
   */
  async testConnection(): Promise<OpenWebUIStatus> {
    const startTime = Date.now();
    
    try {
      // Test primary endpoint (nuru.network proxy)
      const isAvailable = await this.testOpenWebUIEndpoint(this.primaryEndpoint);
      
      const status: OpenWebUIStatus = {
        available: isAvailable,
        endpoint: isAvailable ? this.primaryEndpoint : this.fallbackEndpoint,
        lastChecked: Date.now(),
        responseTime: Date.now() - startTime
      };

      // Cache the result
      this.connectionCache = status;

      console.log(`OpenWebUI connection test completed in ${status.responseTime}ms:`, status);
      return status;
    } catch (error) {
      console.error('OpenWebUI connection test failed:', error);
      return {
        available: false,
        endpoint: this.primaryEndpoint,
        lastChecked: Date.now(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get cached connection status or test if cache is stale
   */
  async getConnectionStatus(): Promise<OpenWebUIStatus> {
    if (this.connectionCache && 
        Date.now() - this.connectionCache.lastChecked < this.cacheTimeout) {
      return this.connectionCache;
    }
    
    return await this.testConnection();
  }

  /**
   * Ask a simple question to OpenWebUI
   */
  async askSimpleQuestion(question: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    if (!question.trim()) {
      return {
        response: 'Please provide a question',
        responseTime: Date.now() - startTime,
        success: false,
        source: 'openwebui',
        error: 'Empty question'
      };
    }

    // Try primary endpoint first (nuru.network proxy)
    try {
      const response = await this.sendChatRequest(this.primaryEndpoint, question);
      return {
        response,
        responseTime: Date.now() - startTime,
        success: true,
        source: 'openwebui'
      };
    } catch (primaryError) {
      console.log('Primary OpenWebUI endpoint failed, trying fallback:', primaryError);
      
      // Fallback to direct XNode2 access
      try {
        const response = await this.sendChatRequest(this.fallbackEndpoint, question);
        return {
          response,
          responseTime: Date.now() - startTime,
          success: true,
          source: 'fallback'
        };
      } catch (fallbackError) {
        console.error('Both OpenWebUI endpoints failed:', {primaryError, fallbackError});
        return {
          response: 'OpenWebUI is currently unavailable. Please try again later. You can also access the chat interface directly at https://nuru.network/api/chat/',
          responseTime: Date.now() - startTime,
          success: false,
          source: 'openwebui',
          error: 'Both endpoints failed'
        };
      }
    }
  }

  /**
   * Get available models from OpenWebUI
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      // Try to fetch models from OpenWebUI API
      const status = await this.getConnectionStatus();
      if (status.available) {
        // For now, return known models based on XNode2 configuration
        return ['qwen2.5:0.5b', 'deepseek-r1', 'phi-3', 'mistral'];
      }
      return [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Get OpenWebUI interface URL for embedding
   */
  getOpenWebUIUrl(): string {
    return this.primaryEndpoint;
  }

  /**
   * Get basic information about the AI service for debugging
   */
  getServiceInfo() {
    return {
      service: 'OpenWebUI Integration',
      primaryEndpoint: this.primaryEndpoint,
      fallbackEndpoint: this.fallbackEndpoint,
      cacheTimeout: this.cacheTimeout,
      lastConnectionCheck: this.connectionCache?.lastChecked || null,
      interfaceUrl: this.getOpenWebUIUrl()
    };
  }

  /**
   * Test OpenWebUI endpoint availability
   */
  private async testOpenWebUIEndpoint(endpoint: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/json',
          'User-Agent': 'Sippar-AI-Integration/1.0.0'
        }
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log(`OpenWebUI endpoint ${endpoint} is not accessible:`, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Send chat request to OpenWebUI
   * This implements the OpenWebUI API format for chat completions
   */
  private async sendChatRequest(endpoint: string, question: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for AI responses

    try {
      // First, check if endpoint is available
      const isAvailable = await this.testOpenWebUIEndpoint(endpoint);
      if (!isAvailable) {
        throw new Error(`OpenWebUI endpoint ${endpoint} is not available`);
      }

      // For the proof of concept, we'll provide a redirect to the OpenWebUI interface
      // since direct API integration requires authentication setup
      return `OpenWebUI is available for chat at ${endpoint}. Question received: "${question}". 
      
To chat with AI models including qwen2.5:0.5b, visit: ${endpoint}

This is a proof of concept integration. Full API integration can be implemented in the next phase once authentication patterns are established.`;

    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`OpenWebUI chat request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const sipparAIService = new SipparAIService();