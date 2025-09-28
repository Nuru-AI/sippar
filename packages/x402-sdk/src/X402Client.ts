/**
 * Main X402 Client for interacting with Sippar's X402 Payment Protocol
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  X402Config,
  X402PaymentRequest,
  X402PaymentResponse,
  X402PaymentStatus,
  X402MarketplaceResponse,
  X402AnalyticsResponse,
  X402ServiceToken,
  X402AIRequest,
  X402AIResponse,
  X402EnterpriseBillingRequest,
  X402EnterpriseBillingResponse,
  X402ErrorResponse,
  X402ServiceCallOptions
} from './types';
import { X402Error, PaymentRequiredError, InvalidTokenError } from './errors';
import { DEFAULT_X402_CONFIG, X402_ENDPOINTS, SDK_INFO } from './constants';
import { validatePaymentToken, isValidAlgorandAddress } from './utils';

/**
 * X402Client - Main SDK client for X402 + Chain Fusion integration
 *
 * Provides methods for:
 * - Creating X402 payments backed by ICP threshold signatures
 * - Accessing payment-protected AI services
 * - Managing service tokens and marketplace discovery
 * - Enterprise billing and analytics
 *
 * @example
 * ```typescript
 * const client = new X402Client({
 *   principal: '7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae',
 *   algorandAddress: '6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI'
 * });
 *
 * // Discover available services
 * const marketplace = await client.getMarketplace();
 *
 * // Create payment for AI service
 * const payment = await client.createPayment({
 *   service: 'ai-oracle-enhanced',
 *   amount: 0.05
 * });
 *
 * // Use AI service with payment token
 * const aiResponse = await client.queryAI({
 *   query: 'Analyze current market conditions',
 *   model: 'deepseek-r1'
 * }, payment.serviceToken);
 * ```
 */
export class X402Client {
  private readonly config: X402Config & { baseURL: string; timeout: number };
  private readonly httpClient: AxiosInstance;

  constructor(config: X402Config) {
    // Validate required configuration
    if (!config.principal) {
      throw new X402Error('Internet Identity principal is required');
    }
    if (!config.algorandAddress) {
      throw new X402Error('Algorand address is required');
    }
    if (!isValidAlgorandAddress(config.algorandAddress)) {
      throw new X402Error('Invalid Algorand address format');
    }

    // Merge with defaults
    this.config = {
      baseURL: DEFAULT_X402_CONFIG.baseURL!,
      timeout: DEFAULT_X402_CONFIG.timeout!,
      ...config
    };

    // Create HTTP client with default configuration
    this.httpClient = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': SDK_INFO.USER_AGENT,
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey })
      }
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 402) {
          throw new PaymentRequiredError(
            error.response.data?.error || 'Payment Required',
            error.response.data
          );
        }
        if (error.response?.status === 401) {
          throw new InvalidTokenError(
            error.response.data?.error || 'Invalid or expired token'
          );
        }
        throw new X402Error(
          error.response?.data?.error || error.message,
          error.response?.data
        );
      }
    );
  }

  /**
   * Create an X402 payment for a specific service
   *
   * @param request Payment request details
   * @returns Payment response with service token
   */
  async createPayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    try {
      const response = await this.httpClient.post<X402PaymentResponse>(X402_ENDPOINTS.CREATE_PAYMENT, {
        ...request,
        principal: this.config.principal,
        algorandAddress: this.config.algorandAddress
      });

      if (!response.data.success) {
        throw new X402Error('Payment creation failed', response.data);
      }

      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error('Failed to create payment', error);
    }
  }

  /**
   * Get payment status by payment ID
   *
   * @param paymentId Payment identifier
   * @returns Payment status information
   */
  async getPaymentStatus(paymentId: string): Promise<X402PaymentStatus> {
    try {
      const response = await this.httpClient.get<X402PaymentStatus>(`${X402_ENDPOINTS.PAYMENT_STATUS}/${paymentId}`);
      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error('Failed to get payment status', error);
    }
  }

  /**
   * Verify if a service token is valid
   *
   * @param token Service token to verify
   * @returns Token validation result
   */
  async verifyToken(token: string): Promise<X402ServiceToken> {
    try {
      const response = await this.httpClient.post<X402ServiceToken>(X402_ENDPOINTS.VERIFY_TOKEN, {
        token
      });
      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error('Failed to verify token', error);
    }
  }

  /**
   * Get available services from X402 marketplace
   *
   * @returns Marketplace information with available services
   */
  async getMarketplace(): Promise<X402MarketplaceResponse> {
    try {
      const response = await this.httpClient.get<X402MarketplaceResponse>(X402_ENDPOINTS.MARKETPLACE);
      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error('Failed to get marketplace data', error);
    }
  }

  /**
   * Get X402 analytics and usage metrics
   *
   * @returns Analytics data including Algorand integration metrics
   */
  async getAnalytics(): Promise<X402AnalyticsResponse> {
    try {
      const response = await this.httpClient.get<X402AnalyticsResponse>(X402_ENDPOINTS.ANALYTICS);
      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error('Failed to get analytics data', error);
    }
  }

  /**
   * Query AI service with payment protection
   *
   * @param request AI query request
   * @param serviceToken Valid service token from payment
   * @returns AI response with Algorand integration proof
   */
  async queryAI(request: X402AIRequest, serviceToken: string): Promise<X402AIResponse> {
    if (!validatePaymentToken(serviceToken)) {
      throw new InvalidTokenError('Invalid service token format');
    }

    try {
      const endpoint = request.model === 'deepseek-r1' || request.options?.explanation
        ? X402_ENDPOINTS.AI_ENHANCED_QUERY
        : X402_ENDPOINTS.AI_QUERY;

      const response = await this.httpClient.post<X402AIResponse>(endpoint, request, {
        headers: {
          'X-Service-Token': serviceToken
        }
      });

      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error('Failed to query AI service', error);
    }
  }

  /**
   * Call any X402-protected service endpoint
   *
   * @param endpoint Service endpoint path
   * @param data Request data
   * @param options Service call options including token
   * @returns Service response
   */
  async callService<T = any>(
    endpoint: string,
    data: any = {},
    options: X402ServiceCallOptions
  ): Promise<T> {
    if (!validatePaymentToken(options.token)) {
      throw new InvalidTokenError('Invalid service token format');
    }

    try {
      const config: AxiosRequestConfig = {
        headers: {
          'X-Service-Token': options.token,
          ...options.headers
        },
        timeout: options.timeout
      };

      const response = await this.httpClient.post<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error(`Failed to call service ${endpoint}`, error);
    }
  }

  /**
   * Get enterprise billing information
   *
   * @param request Billing request parameters
   * @returns Enterprise billing data
   */
  async getEnterpriseBilling(request: X402EnterpriseBillingRequest): Promise<X402EnterpriseBillingResponse> {
    try {
      const response = await this.httpClient.post<X402EnterpriseBillingResponse>(X402_ENDPOINTS.ENTERPRISE_BILLING, request);
      return response.data;
    } catch (error) {
      if (error instanceof X402Error) throw error;
      throw new X402Error('Failed to get enterprise billing data', error);
    }
  }

  /**
   * Create payment and immediately call service (convenience method)
   *
   * @param service Service identifier
   * @param amount Payment amount
   * @param serviceData Data to send to service
   * @param serviceEndpoint Service endpoint path
   * @returns Service response
   */
  async payAndCall<T = any>(
    service: string,
    amount: number,
    serviceData: any,
    serviceEndpoint: string
  ): Promise<T> {
    // Create payment
    const payment = await this.createPayment({ service, amount });

    // Call service with token
    return this.callService<T>(serviceEndpoint, serviceData, {
      token: payment.serviceToken
    });
  }

  /**
   * Update client configuration
   *
   * @param newConfig Partial configuration to update
   */
  updateConfig(newConfig: Partial<X402Config>): void {
    Object.assign(this.config, newConfig);

    // Update HTTP client if baseURL or timeout changed
    if (newConfig.baseURL) {
      this.httpClient.defaults.baseURL = newConfig.baseURL;
    }
    if (newConfig.timeout) {
      this.httpClient.defaults.timeout = newConfig.timeout;
    }
    if (newConfig.apiKey) {
      this.httpClient.defaults.headers['X-API-Key'] = newConfig.apiKey;
    }
  }

  /**
   * Get current client configuration
   *
   * @returns Current configuration (without sensitive data)
   */
  getConfig(): Omit<X402Config & { baseURL: string; timeout: number }, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }
}