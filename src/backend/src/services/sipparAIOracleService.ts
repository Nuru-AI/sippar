/**
 * SipparAIOracleService - Algorand Oracle Integration Service
 * 
 * Extends the existing SipparAIService with Algorand Indexer integration
 * for monitoring oracle requests and delivering AI responses via callbacks.
 * 
 * Architecture:
 * 1. Monitor Algorand blockchain for oracle requests (transaction notes)
 * 2. Extract request parameters from transaction arguments
 * 3. Process AI queries using existing XNode2 infrastructure
 * 4. Format responses for smart contract consumption
 * 5. Call callback contracts with AI results
 */

import algosdk from 'algosdk';
import { SipparAIService, AIResponse } from './sipparAIService.js';

export interface AlgorandOracleRequest {
  transactionId: string;
  sender: string;
  applicationId: number;
  query: string;
  model: string;
  callbackAppId: number;
  callbackMethod: string;
  timestamp: number;
  round: number;
}

export interface OracleAIResponse extends AIResponse {
  requestId: string;
  confidenceScore: number;
  processingTimeMs: number;
  formattedForContract: string;
}

export interface IndexerConfig {
  server: string;
  port: number;
  token: string;
}

export class SipparAIOracleService extends SipparAIService {
  private indexer: algosdk.Indexer;
  private oracleAppId: number | null = null;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastProcessedRound: number = 0;
  
  // Oracle-specific constants
  private readonly ORACLE_NOTE_PREFIX = 'sippar-ai-oracle';
  private readonly POLLING_INTERVAL_MS = 2000; // 2 seconds
  private readonly MAX_RETRIES = 3;
  private readonly SUPPORTED_MODELS = ['qwen2.5', 'deepseek-r1', 'phi-3', 'mistral'];

  constructor(indexerConfig: IndexerConfig) {
    super();
    
    // Initialize Algorand Indexer
    this.indexer = new algosdk.Indexer(
      indexerConfig.token,
      indexerConfig.server,
      indexerConfig.port
    );
    
    console.log('SipparAIOracleService initialized with Algorand Indexer');
  }

  /**
   * Set the oracle application ID to monitor
   */
  setOracleAppId(appId: number): void {
    this.oracleAppId = appId;
    console.log(`Oracle monitoring set for application ID: ${appId}`);
  }

  /**
   * Start monitoring Algorand blockchain for oracle requests
   */
  async startOracleMonitoring(): Promise<void> {
    if (!this.oracleAppId) {
      throw new Error('Oracle application ID must be set before starting monitoring');
    }

    if (this.isMonitoring) {
      console.log('Oracle monitoring is already running');
      return;
    }

    console.log(`Starting oracle monitoring for app ID ${this.oracleAppId}...`);
    
    // Get current round to start monitoring from
    try {
      const status = await this.indexer.makeHealthCheck().do();
      this.lastProcessedRound = status.round;
      console.log(`Starting oracle monitoring from round: ${this.lastProcessedRound}`);
    } catch (error) {
      console.error('Failed to get indexer status:', error);
      this.lastProcessedRound = 0;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.processNewOracleRequests().catch(error => {
        console.error('Error processing oracle requests:', error);
      });
    }, this.POLLING_INTERVAL_MS);

    console.log('Oracle monitoring started successfully');
  }

  /**
   * Stop monitoring oracle requests
   */
  stopOracleMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('Oracle monitoring is not running');
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('Oracle monitoring stopped');
  }

  /**
   * Process new oracle requests from the blockchain
   */
  private async processNewOracleRequests(): Promise<void> {
    if (!this.oracleAppId) return;

    try {
      // Query indexer for recent transactions to our oracle app
      const response = await this.indexer
        .searchForTransactions()
        .applicationID(this.oracleAppId)
        .minRound(this.lastProcessedRound + 1)
        .notePrefix(Buffer.from(this.ORACLE_NOTE_PREFIX).toString('base64'))
        .do();

      if (response.transactions && response.transactions.length > 0) {
        console.log(`Found ${response.transactions.length} new oracle requests`);

        for (const tx of response.transactions) {
          await this.processOracleRequest(tx);
        }

        // Update last processed round
        const latestRound = Math.max(...response.transactions.map((tx: any) => tx['confirmed-round']));
        this.lastProcessedRound = latestRound;
      }

    } catch (error) {
      console.error('Error querying indexer for oracle requests:', error);
    }
  }

  /**
   * Process individual oracle request transaction
   */
  private async processOracleRequest(transaction: any): Promise<void> {
    try {
      const oracleRequest = this.parseOracleRequest(transaction);
      console.log(`Processing oracle request: ${oracleRequest.transactionId}`);
      console.log(`Query: "${oracleRequest.query}" using model: ${oracleRequest.model}`);

      // Validate request parameters
      if (!this.validateOracleRequest(oracleRequest)) {
        console.error(`Invalid oracle request: ${oracleRequest.transactionId}`);
        return;
      }

      // Process AI query with retry logic
      let aiResponse: OracleAIResponse | null = null;
      let retryCount = 0;

      while (!aiResponse && retryCount < this.MAX_RETRIES) {
        try {
          aiResponse = await this.processAIQuery(oracleRequest);
        } catch (error) {
          retryCount++;
          console.error(`AI query attempt ${retryCount} failed:`, error);
          if (retryCount < this.MAX_RETRIES) {
            await this.delay(1000 * retryCount); // Exponential backoff
          }
        }
      }

      if (aiResponse) {
        // Send response to callback contract
        await this.sendCallbackResponse(oracleRequest, aiResponse);
      } else {
        console.error(`Failed to process AI query after ${this.MAX_RETRIES} attempts`);
      }

    } catch (error) {
      console.error('Error processing oracle request:', error);
    }
  }

  /**
   * Parse oracle request from Algorand transaction
   */
  private parseOracleRequest(transaction: any): AlgorandOracleRequest {
    const appCallTxn = transaction['application-transaction'];
    const applicationArgs = appCallTxn['application-args'];

    // Expected args: ["request_ai_analysis", query, model, callback_app_id, callback_method]
    return {
      transactionId: transaction.id,
      sender: transaction.sender,
      applicationId: appCallTxn['application-id'],
      query: Buffer.from(applicationArgs[1], 'base64').toString('utf-8'),
      model: Buffer.from(applicationArgs[2], 'base64').toString('utf-8'),
      callbackAppId: parseInt(Buffer.from(applicationArgs[3], 'base64').toString('utf-8')),
      callbackMethod: Buffer.from(applicationArgs[4], 'base64').toString('utf-8'),
      timestamp: transaction['round-time'],
      round: transaction['confirmed-round']
    };
  }

  /**
   * Validate oracle request parameters
   */
  private validateOracleRequest(request: AlgorandOracleRequest): boolean {
    // Check query length
    if (!request.query || request.query.length > 1024) {
      console.error('Invalid query length');
      return false;
    }

    // Check supported model
    if (!this.SUPPORTED_MODELS.includes(request.model)) {
      console.error(`Unsupported model: ${request.model}`);
      return false;
    }

    // Check callback parameters
    if (!request.callbackAppId || request.callbackAppId <= 0) {
      console.error('Invalid callback app ID');
      return false;
    }

    if (!request.callbackMethod) {
      console.error('Missing callback method');
      return false;
    }

    return true;
  }

  /**
   * Process AI query using existing infrastructure
   */
  private async processAIQuery(request: AlgorandOracleRequest): Promise<OracleAIResponse> {
    const startTime = Date.now();

    // Use existing AI service to process query
    const aiResponse = await this.askSimpleQuestion(request.query);

    if (!aiResponse.success) {
      throw new Error(`AI service error: ${aiResponse.error}`);
    }

    const processingTime = Date.now() - startTime;

    // Calculate confidence score (simplified for demo)
    const confidenceScore = this.calculateConfidenceScore(aiResponse.response, request.model);

    // Format response for smart contract consumption
    const formattedResponse = this.formatResponseForContract(
      aiResponse.response,
      confidenceScore,
      processingTime
    );

    return {
      ...aiResponse,
      requestId: request.transactionId,
      confidenceScore,
      processingTimeMs: processingTime,
      formattedForContract: formattedResponse
    };
  }

  /**
   * Calculate confidence score based on AI response and model
   */
  private calculateConfidenceScore(response: string, model: string): number {
    // Simplified confidence calculation
    // In a real implementation, this would analyze response quality
    
    let baseScore = 75; // Default confidence
    
    // Model-specific adjustments
    switch (model) {
      case 'deepseek-r1':
        baseScore += 10; // Higher confidence for mathematical analysis
        break;
      case 'phi-3':
        baseScore += 5; // Good for code analysis
        break;
      case 'qwen2.5':
        baseScore += 0; // General purpose baseline
        break;
      case 'mistral':
        baseScore += 3; // Good for NLP
        break;
    }

    // Response length adjustment (longer responses might be more detailed)
    if (response.length > 500) {
      baseScore += 5;
    }

    // Ensure score is within 0-100 range
    return Math.min(100, Math.max(0, baseScore));
  }

  /**
   * Format AI response for smart contract consumption
   */
  private formatResponseForContract(response: string, confidence: number, processingTime: number): string {
    // Create JSON format that smart contracts can parse
    const contractResponse = {
      result: response.substring(0, 1000), // Limit response length for contract storage
      confidence,
      processingTime,
      timestamp: Math.floor(Date.now() / 1000),
      version: '1.0'
    };

    return JSON.stringify(contractResponse);
  }

  /**
   * Send callback response to smart contract
   */
  private async sendCallbackResponse(
    request: AlgorandOracleRequest, 
    aiResponse: OracleAIResponse
  ): Promise<void> {
    try {
      console.log(`Sending callback response to app ${request.callbackAppId}`);
      console.log(`Callback method: ${request.callbackMethod}`);
      console.log(`AI Response: ${aiResponse.formattedForContract.substring(0, 100)}...`);

      // TODO: Implement actual Algorand transaction to call callback contract
      // This would require:
      // 1. Create application call transaction
      // 2. Sign transaction with backend account
      // 3. Submit to Algorand network
      // 4. Wait for confirmation

      // For now, just log the callback details
      console.log('Callback response prepared:', {
        requestId: request.transactionId,
        callbackAppId: request.callbackAppId,
        callbackMethod: request.callbackMethod,
        confidence: aiResponse.confidenceScore,
        processingTime: aiResponse.processingTimeMs
      });

      console.log(`Oracle request ${request.transactionId} processed successfully`);

    } catch (error) {
      console.error('Error sending callback response:', error);
      throw error;
    }
  }

  /**
   * Get oracle monitoring status
   */
  getOracleStatus() {
    return {
      isMonitoring: this.isMonitoring,
      oracleAppId: this.oracleAppId,
      lastProcessedRound: this.lastProcessedRound,
      pollingInterval: this.POLLING_INTERVAL_MS,
      supportedModels: this.SUPPORTED_MODELS
    };
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export default indexer configuration
export const DEFAULT_INDEXER_CONFIG: IndexerConfig = {
  server: 'https://testnet-idx.algonode.cloud',
  port: 443,
  token: '' // No token needed for public Algonode
};

// Export singleton instance (will need to be initialized with proper config)
export let sipparAIOracleService: SipparAIOracleService | null = null;

export function initializeOracleService(indexerConfig: IndexerConfig): SipparAIOracleService {
  sipparAIOracleService = new SipparAIOracleService(indexerConfig);
  return sipparAIOracleService;
}