/**
 * Oracle Monitoring Service - Sprint 009 Phase 3
 * Production-grade monitoring and error tracking for Oracle system
 */

export interface OracleMetrics {
  // Request metrics
  totalRequests: number;
  successfulCallbacks: number;
  failedCallbacks: number;
  averageProcessingTime: number;
  
  // Performance metrics
  aiResponseTimes: number[];
  callbackTransactionTimes: number[];
  blockchainConfirmationTimes: number[];
  
  // Error tracking
  recentErrors: OracleError[];
  errorCounts: Map<string, number>;
  
  // System health
  lastHealthCheck: number;
  oracleAccountBalance: number;
  uptime: number;
  roundsProcessed: number;
}

export interface OracleError {
  timestamp: number;
  type: 'AI_PROCESSING' | 'TRANSACTION_CREATION' | 'SIGNING' | 'NETWORK_SUBMISSION' | 'CONFIRMATION';
  requestId: string;
  error: string;
  details?: any;
  retryCount: number;
}

export interface OracleHealthStatus {
  overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';
  components: {
    oracleMonitoring: boolean;
    aiService: boolean;
    thresholdSigner: boolean;
    algorandNetwork: boolean;
    oracleAccount: boolean;
  };
  metrics: OracleMetrics;
  alerts: string[];
  lastUpdated: number;
}

export class OracleMonitoringService {
  private metrics: OracleMetrics;
  private startTime: number;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly ERROR_HISTORY_LIMIT = 100;
  private readonly PERFORMANCE_WINDOW = 1000; // Keep last 1000 measurements
  
  constructor() {
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
    this.startHealthChecking();
  }
  
  private initializeMetrics(): OracleMetrics {
    return {
      totalRequests: 0,
      successfulCallbacks: 0,
      failedCallbacks: 0,
      averageProcessingTime: 0,
      aiResponseTimes: [],
      callbackTransactionTimes: [],
      blockchainConfirmationTimes: [],
      recentErrors: [],
      errorCounts: new Map(),
      lastHealthCheck: Date.now(),
      oracleAccountBalance: 0,
      uptime: 0,
      roundsProcessed: 0
    };
  }
  
  /**
   * Record successful Oracle request processing
   */
  recordSuccessfulRequest(requestId: string, processingTimeMs: number, aiResponseTimeMs: number, confirmationTimeMs: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulCallbacks++;
    
    // Update performance metrics
    this.addPerformanceMetric(this.metrics.aiResponseTimes, aiResponseTimeMs);
    this.addPerformanceMetric(this.metrics.callbackTransactionTimes, processingTimeMs);
    this.addPerformanceMetric(this.metrics.blockchainConfirmationTimes, confirmationTimeMs);
    
    // Update average processing time
    this.updateAverageProcessingTime();
    
    console.log(`📊 Oracle success recorded: ${requestId} (${processingTimeMs}ms total)`);
  }
  
  /**
   * Record failed Oracle request
   */
  recordFailedRequest(requestId: string, errorType: OracleError['type'], error: string, details?: any, retryCount: number = 0): void {
    this.metrics.totalRequests++;
    this.metrics.failedCallbacks++;
    
    const oracleError: OracleError = {
      timestamp: Date.now(),
      type: errorType,
      requestId,
      error,
      details,
      retryCount
    };
    
    // Add to recent errors (with limit)
    this.metrics.recentErrors.unshift(oracleError);
    if (this.metrics.recentErrors.length > this.ERROR_HISTORY_LIMIT) {
      this.metrics.recentErrors.pop();
    }
    
    // Update error counts
    const errorKey = `${errorType}: ${error}`;
    this.metrics.errorCounts.set(errorKey, (this.metrics.errorCounts.get(errorKey) || 0) + 1);
    
    console.error(`❌ Oracle error recorded: ${requestId} - ${errorType}: ${error}`);
    
    // Trigger alerts for critical errors
    this.checkForAlerts(oracleError);
  }
  
  /**
   * Update round processing count
   */
  recordRoundProcessed(round: number): void {
    this.metrics.roundsProcessed = Math.max(this.metrics.roundsProcessed, round);
  }
  
  /**
   * Get current system health status
   */
  async getHealthStatus(): Promise<OracleHealthStatus> {
    const now = Date.now();
    this.metrics.uptime = now - this.startTime;
    this.metrics.lastHealthCheck = now;
    
    // Check component health
    const components = await this.checkComponentHealth();
    
    // Determine overall health
    const overall = this.calculateOverallHealth(components);
    
    // Generate alerts
    const alerts = this.generateHealthAlerts(components);
    
    return {
      overall,
      components,
      metrics: this.metrics,
      alerts,
      lastUpdated: now
    };
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(): any {
    return {
      successRate: this.getSuccessRate(),
      averageAIResponseTime: this.getAverageMetric(this.metrics.aiResponseTimes),
      averageCallbackTime: this.getAverageMetric(this.metrics.callbackTransactionTimes),
      averageConfirmationTime: this.getAverageMetric(this.metrics.blockchainConfirmationTimes),
      totalProcessed: this.metrics.totalRequests,
      uptime: this.metrics.uptime,
      errorRate: this.getErrorRate(),
      topErrors: this.getTopErrors()
    };
  }
  
  /**
   * Get recent error summary
   */
  getErrorSummary(limit: number = 10): OracleError[] {
    return this.metrics.recentErrors.slice(0, limit);
  }
  
  /**
   * Clear metrics (for testing/reset)
   */
  clearMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
  }
  
  private addPerformanceMetric(metrics: number[], value: number): void {
    metrics.unshift(value);
    if (metrics.length > this.PERFORMANCE_WINDOW) {
      metrics.pop();
    }
  }
  
  private updateAverageProcessingTime(): void {
    const total = this.metrics.aiResponseTimes.reduce((sum, time) => sum + time, 0);
    this.metrics.averageProcessingTime = this.metrics.aiResponseTimes.length > 0 
      ? total / this.metrics.aiResponseTimes.length 
      : 0;
  }
  
  private async checkComponentHealth(): Promise<OracleHealthStatus['components']> {
    // This would integrate with actual service health checks
    return {
      oracleMonitoring: true, // Check sipparAIOracleService status
      aiService: true, // Check SipparAIService availability
      thresholdSigner: true, // Check ICP canister connectivity
      algorandNetwork: true, // Check Algorand API connectivity
      oracleAccount: true // Check Oracle account balance
    };
  }
  
  private calculateOverallHealth(components: OracleHealthStatus['components']): OracleHealthStatus['overall'] {
    const componentStatuses = Object.values(components);
    const healthyCount = componentStatuses.filter(status => status).length;
    const totalCount = componentStatuses.length;
    
    const healthPercentage = healthyCount / totalCount;
    
    if (healthPercentage === 1) return 'HEALTHY';
    if (healthPercentage >= 0.8) return 'DEGRADED';
    if (healthPercentage >= 0.5) return 'CRITICAL';
    return 'OFFLINE';
  }
  
  private generateHealthAlerts(components: OracleHealthStatus['components']): string[] {
    const alerts: string[] = [];
    
    // Component-specific alerts
    if (!components.oracleMonitoring) alerts.push('Oracle monitoring is offline');
    if (!components.aiService) alerts.push('AI service is unavailable');
    if (!components.thresholdSigner) alerts.push('Threshold signer connectivity issues');
    if (!components.algorandNetwork) alerts.push('Algorand network connectivity issues');
    if (!components.oracleAccount) alerts.push('Oracle account issues (low balance?)');
    
    // Performance alerts
    const errorRate = this.getErrorRate();
    if (errorRate > 0.1) alerts.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    
    const avgResponseTime = this.getAverageMetric(this.metrics.aiResponseTimes);
    if (avgResponseTime > 1000) alerts.push(`Slow AI response times: ${avgResponseTime.toFixed(0)}ms`);
    
    return alerts;
  }
  
  private checkForAlerts(error: OracleError): void {
    // Critical error patterns that need immediate attention
    const criticalErrors = ['SIGNING', 'NETWORK_SUBMISSION'];
    
    if (criticalErrors.includes(error.type)) {
      console.warn(`🚨 Critical Oracle error: ${error.type} - ${error.error}`);
      // In production, this would trigger alerts (email, Slack, etc.)
    }
    
    // High retry count indicates persistent issues
    if (error.retryCount >= 3) {
      console.warn(`🔄 High retry count for request ${error.requestId}: ${error.retryCount} attempts`);
    }
  }
  
  private getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 1.0;
    return this.metrics.successfulCallbacks / this.metrics.totalRequests;
  }
  
  private getErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.failedCallbacks / this.metrics.totalRequests;
  }
  
  private getAverageMetric(metrics: number[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, value) => sum + value, 0) / metrics.length;
  }
  
  private getTopErrors(limit: number = 5): Array<{error: string, count: number}> {
    return Array.from(this.metrics.errorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([error, count]) => ({ error, count }));
  }
  
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.getHealthStatus();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const oracleMonitoringService = new OracleMonitoringService();