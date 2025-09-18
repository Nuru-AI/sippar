import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import axios, { AxiosInstance } from 'axios';

import { AIService } from '../services/AIService';
import { CkAlgoService } from '../services/CkAlgoService';
import { CrossChainService } from '../services/CrossChainService';
import { X402Service } from '../services/X402Service';
import { SipparConfig, Network } from '../types/common';
import { SIPPAR_CANISTER_ID, BACKEND_URL } from '../config/constants';

/**
 * Main Sippar SDK Client
 * Provides access to all Sippar platform capabilities
 */
export class SipparClient {
  private agent: HttpAgent;
  private httpClient: AxiosInstance;
  private config: SipparConfig;

  // Service instances
  public readonly ai: AIService;
  public readonly ckAlgo: CkAlgoService;
  public readonly crossChain: CrossChainService;
  public readonly x402: X402Service;

  constructor(config: Partial<SipparConfig> = {}) {
    this.config = {
      network: 'mainnet',
      canisterId: SIPPAR_CANISTER_ID,
      backendUrl: BACKEND_URL,
      timeout: 30000,
      ...config
    };

    // Initialize HTTP Agent for ICP
    this.agent = new HttpAgent({
      host: this.config.network === 'local'
        ? 'http://localhost:8000'
        : 'https://ic0.app'
    });

    // Initialize HTTP client for backend API
    this.httpClient = axios.create({
      baseURL: this.config.backendUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Initialize services
    this.ai = new AIService(this.httpClient, this.config);
    this.ckAlgo = new CkAlgoService(this.agent, this.httpClient, this.config);
    this.crossChain = new CrossChainService(this.agent, this.httpClient, this.config);
    this.x402 = new X402Service(this.config.backendUrl);
  }

  /**
   * Connect user with Internet Identity
   */
  async connect(): Promise<Principal> {
    // Implementation would integrate with Internet Identity
    throw new Error('Internet Identity integration not implemented in SDK v0.1');
  }

  /**
   * Disconnect user
   */
  async disconnect(): Promise<void> {
    // Clear any cached authentication
  }

  /**
   * Get current user principal
   */
  getCurrentUser(): Principal | null {
    // Return cached principal if available
    return null;
  }

  /**
   * Check if user is connected
   */
  isConnected(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Get platform health status
   */
  async getHealth() {
    try {
      const response = await this.httpClient.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get platform health: ${error}`);
    }
  }

  /**
   * Get platform statistics
   */
  async getStats() {
    try {
      const [aiHealth, ckAlgoBalance] = await Promise.all([
        this.httpClient.get('/api/sippar/ai/health'),
        // Add more stat endpoints as needed
      ]);

      return {
        ai: aiHealth.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get platform stats: ${error}`);
    }
  }
}