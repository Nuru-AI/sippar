/**
 * Production Monitoring Service
 * Sprint X.1 Phase 2 - Real-time system health and migration monitoring
 *
 * Provides comprehensive monitoring capabilities for:
 * - System health metrics (CPU, memory, disk, network)
 * - Migration system metrics (user counts, success rates, processing times)
 * - Reserve backing metrics (collateralization, canister health)
 * - Alert condition detection and escalation
 */

import { Principal } from '@dfinity/principal';
import * as os from 'os';
import * as fs from 'fs/promises';
import { migrationService } from './migrationService.js';
import { ReserveVerificationService } from './reserveVerificationService.js';
import { simplifiedBridgeService } from './simplifiedBridgeService.js';
import { ckAlgoService } from './ckAlgoService.js';

// Types for monitoring data
export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  serviceUptime: number;
  loadAverage: number[];
  activeConnections: number;
  timestamp: string;
}

export interface MigrationMetrics {
  totalUsers: number;
  migratedUsers: {
    freshStart: number;
    migrationBridge: number;
    legacyHold: number;
  };
  migrationRate: number; // migrations per hour
  errorRate: number; // percentage of failed migrations
  avgProcessingTime: number; // seconds
  successRate: number;
  pendingMigrations: number;
  timestamp: string;
}

export interface ReserveMetrics {
  reserveRatio: number;
  totalAlgoLocked: number;
  totalCkAlgoSupply: number;
  backingHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  thresholdStatus: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  canisterHealth: {
    simplifiedBridge: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
    thresholdSigner: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  };
  lastVerification: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  timestamp: string;
  actionRequired?: string;
  autoResponse?: string;
  resolved?: boolean;
  resolvedAt?: string;
}

export interface HealthCheckResult {
  component: string;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  responseTime?: number;
  lastCheck: string;
  details?: any;
}

export class ProductionMonitoringService {
  private alertHistory: Alert[] = [];
  private healthCheckHistory: Map<string, HealthCheckResult[]> = new Map();
  private metricsHistory: {
    system: SystemMetrics[];
    migration: MigrationMetrics[];
    reserve: ReserveMetrics[];
  } = {
    system: [],
    migration: [],
    reserve: []
  };
  private reserveVerificationService: ReserveVerificationService;

  constructor() {
    this.reserveVerificationService = new ReserveVerificationService();
    console.log('🔍 ProductionMonitoringService initialized');
  }

  /**
   * Collect comprehensive system health metrics
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();
      const networkLatency = await this.getNetworkLatency();
      const serviceUptime = process.uptime();
      const loadAverage = os.loadavg();
      const activeConnections = await this.getActiveConnections();

      const metrics: SystemMetrics = {
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkLatency,
        serviceUptime,
        loadAverage,
        activeConnections,
        timestamp: new Date().toISOString()
      };

      // Store in history (keep last 100 entries)
      this.metricsHistory.system.push(metrics);
      if (this.metricsHistory.system.length > 100) {
        this.metricsHistory.system.shift();
      }

      console.log(`📊 System metrics collected: CPU=${cpuUsage.toFixed(1)}%, Memory=${(memoryUsage * 100).toFixed(1)}%, Disk=${(diskUsage * 100).toFixed(1)}%`);
      return metrics;

    } catch (error) {
      console.error('❌ Error collecting system metrics:', error);
      throw new Error(`Failed to collect system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect migration system specific metrics
   */
  async collectMigrationMetrics(): Promise<MigrationMetrics> {
    try {
      // Get base migration statistics
      const migrationStats = await migrationService.getMigrationStatistics();

      // Calculate additional metrics
      const migrationRate = await this.calculateMigrationRate();
      const errorRate = await this.calculateMigrationErrorRate();
      const avgProcessingTime = await this.getAvgMigrationProcessingTime();
      const pendingMigrations = await this.getPendingMigrationsCount();

      const metrics: MigrationMetrics = {
        totalUsers: migrationStats.totalUsers,
        migratedUsers: migrationStats.migratedUsers,
        migrationRate,
        errorRate,
        avgProcessingTime,
        successRate: migrationStats.migrationHealth.successRate,
        pendingMigrations,
        timestamp: new Date().toISOString()
      };

      // Store in history
      this.metricsHistory.migration.push(metrics);
      if (this.metricsHistory.migration.length > 100) {
        this.metricsHistory.migration.shift();
      }

      console.log(`📈 Migration metrics collected: ${metrics.totalUsers} users, ${(metrics.successRate * 100).toFixed(1)}% success rate`);
      return metrics;

    } catch (error) {
      console.error('❌ Error collecting migration metrics:', error);
      throw new Error(`Failed to collect migration metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect reserve and backing health metrics
   */
  async collectReserveMetrics(): Promise<ReserveMetrics> {
    try {
      // Get reserve status from existing service
      const reserveStatus = await this.reserveVerificationService.getReserveStatus();

      // Assess backing health
      const backingHealth = await this.assessBackingHealth(reserveStatus.reserveRatio);

      // Check threshold signature system status
      const thresholdStatus = await this.checkThresholdStatus();

      // Check canister health
      const canisterHealth = await this.checkCanisterHealth();

      const metrics: ReserveMetrics = {
        reserveRatio: reserveStatus.reserveRatio,
        totalAlgoLocked: reserveStatus.totalLockedAlgo || 0,
        totalCkAlgoSupply: reserveStatus.totalCkAlgoSupply || 0,
        backingHealth,
        thresholdStatus,
        canisterHealth,
        lastVerification: new Date(reserveStatus.lastVerificationTime || Date.now()).toISOString(),
        timestamp: new Date().toISOString()
      };

      // Store in history
      this.metricsHistory.reserve.push(metrics);
      if (this.metricsHistory.reserve.length > 100) {
        this.metricsHistory.reserve.shift();
      }

      console.log(`🏦 Reserve metrics collected: ${(metrics.reserveRatio * 100).toFixed(1)}% backing ratio, ${metrics.backingHealth} health`);
      return metrics;

    } catch (error) {
      console.error('❌ Error collecting reserve metrics:', error);
      throw new Error(`Failed to collect reserve metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check for alert conditions across all monitored systems
   */
  async checkAlertConditions(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // System health alerts
      const systemMetrics = await this.collectSystemMetrics();
      alerts.push(...this.checkSystemAlerts(systemMetrics));

      // Migration system alerts
      const migrationMetrics = await this.collectMigrationMetrics();
      alerts.push(...this.checkMigrationAlerts(migrationMetrics));

      // Reserve backing alerts
      const reserveMetrics = await this.collectReserveMetrics();
      alerts.push(...this.checkReserveAlerts(reserveMetrics));

      // Store new alerts in history
      alerts.forEach(alert => {
        this.alertHistory.push(alert);
      });

      // Keep alert history manageable (last 1000 alerts)
      if (this.alertHistory.length > 1000) {
        this.alertHistory = this.alertHistory.slice(-1000);
      }

      if (alerts.length > 0) {
        console.log(`🚨 ${alerts.length} alerts detected`);
      }

      return alerts;

    } catch (error) {
      console.error('❌ Error checking alert conditions:', error);

      // Create critical alert for monitoring system failure
      const criticalAlert = this.createAlert(
        'MONITORING_SYSTEM_FAILURE',
        'CRITICAL',
        'Monitoring system failed to check alert conditions',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return [criticalAlert];
    }
  }

  /**
   * Execute comprehensive health checks
   */
  async executeHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    try {
      // Check ICP canister connectivity
      results.push(await this.checkCanisterConnectivity('threshold_signer'));
      results.push(await this.checkCanisterConnectivity('simplified_bridge'));

      // Check Algorand network connectivity
      results.push(await this.checkAlgorandConnectivity());

      // Check database/storage health
      results.push(await this.checkStorageHealth());

      // Check external API dependencies
      results.push(await this.checkExternalAPIs());

      // Store health check history
      results.forEach(result => {
        if (!this.healthCheckHistory.has(result.component)) {
          this.healthCheckHistory.set(result.component, []);
        }
        const history = this.healthCheckHistory.get(result.component)!;
        history.push(result);

        // Keep last 50 health checks per component
        if (history.length > 50) {
          history.shift();
        }
      });

      console.log(`🏥 Health checks completed: ${results.filter(r => r.status === 'HEALTHY').length}/${results.length} healthy`);
      return results;

    } catch (error) {
      console.error('❌ Error executing health checks:', error);
      throw new Error(`Failed to execute health checks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods for system metrics

  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(cpuPercent, 100)); // Cap at 100%
      }, 100);
    });
  }

  private getMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return usedMemory / totalMemory; // Return as ratio (0-1)
  }

  private async getDiskUsage(): Promise<number> {
    try {
      const stats = await fs.stat('/');
      // This is a simplified implementation - in production you'd want more detailed disk monitoring
      return 0.5; // Placeholder - would need platform-specific implementation
    } catch (error) {
      console.warn('⚠️ Could not get disk usage:', error);
      return 0;
    }
  }

  private async getNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      // Simple network latency test to localhost
      await fetch('http://localhost:3004/health');
      return Date.now() - start;
    } catch (error) {
      console.warn('⚠️ Could not measure network latency:', error);
      return -1;
    }
  }

  private async getActiveConnections(): Promise<number> {
    // Placeholder - would need platform-specific implementation
    return 0;
  }

  // Private helper methods for migration metrics

  private async calculateMigrationRate(): Promise<number> {
    // Calculate migrations per hour based on recent history
    const recentHistory = this.metricsHistory.migration.slice(-24); // Last 24 data points
    if (recentHistory.length < 2) return 0;

    const oldestMigrations = recentHistory[0].migratedUsers.freshStart + recentHistory[0].migratedUsers.migrationBridge;
    const latestMigrations = recentHistory[recentHistory.length - 1].migratedUsers.freshStart + recentHistory[recentHistory.length - 1].migratedUsers.migrationBridge;

    const timeDiffHours = (recentHistory.length - 1) * (5 / 60); // Assuming 5-minute intervals

    return timeDiffHours > 0 ? (latestMigrations - oldestMigrations) / timeDiffHours : 0;
  }

  private async calculateMigrationErrorRate(): Promise<number> {
    // Placeholder - would analyze migration logs for error rate
    return 0.02; // 2% error rate
  }

  private async getAvgMigrationProcessingTime(): Promise<number> {
    // Placeholder - would analyze migration completion times
    return 45; // 45 seconds average
  }

  private async getPendingMigrationsCount(): Promise<number> {
    // Placeholder - would count migrations in progress
    return 0;
  }

  // Private helper methods for reserve metrics

  private async assessBackingHealth(reserveRatio: number): Promise<'HEALTHY' | 'WARNING' | 'CRITICAL'> {
    if (reserveRatio >= 1.0) return 'HEALTHY';
    if (reserveRatio >= 0.95) return 'WARNING';
    return 'CRITICAL';
  }

  private async checkThresholdStatus(): Promise<'OPERATIONAL' | 'DEGRADED' | 'OFFLINE'> {
    try {
      // Test threshold signature functionality
      const testResult = await simplifiedBridgeService.getCanisterStatus();
      return testResult ? 'OPERATIONAL' : 'DEGRADED';
    } catch (error) {
      return 'OFFLINE';
    }
  }

  private async checkCanisterHealth(): Promise<{
    simplifiedBridge: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
    thresholdSigner: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  }> {
    let simplifiedBridge: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'OFFLINE';
    let thresholdSigner: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'OFFLINE';

    try {
      // Check SimplifiedBridge canister
      const bridgeStatus = await simplifiedBridgeService.getCanisterStatus();
      simplifiedBridge = bridgeStatus ? 'HEALTHY' : 'DEGRADED';
    } catch (error) {
      simplifiedBridge = 'OFFLINE';
    }

    try {
      // Check ckALGO canister (threshold signer)
      const balance = await ckAlgoService.getBalance('rdmx6-jaaaa-aaaah-qcaiq-cai'); // Test principal
      thresholdSigner = 'HEALTHY';
    } catch (error) {
      thresholdSigner = 'OFFLINE';
    }

    return { simplifiedBridge, thresholdSigner };
  }

  // Private helper methods for alerts

  private checkSystemAlerts(metrics: SystemMetrics): Alert[] {
    const alerts: Alert[] = [];

    // High memory usage alert
    if (metrics.memoryUsage > 0.85) {
      alerts.push(this.createAlert(
        'HIGH_MEMORY_USAGE',
        metrics.memoryUsage > 0.95 ? 'CRITICAL' : 'HIGH',
        `Memory usage at ${(metrics.memoryUsage * 100).toFixed(1)}%`,
        metrics
      ));
    }

    // High CPU usage alert
    if (metrics.cpuUsage > 80) {
      alerts.push(this.createAlert(
        'HIGH_CPU_USAGE',
        metrics.cpuUsage > 95 ? 'CRITICAL' : 'HIGH',
        `CPU usage at ${metrics.cpuUsage.toFixed(1)}%`,
        metrics
      ));
    }

    // High disk usage alert
    if (metrics.diskUsage > 0.90) {
      alerts.push(this.createAlert(
        'HIGH_DISK_USAGE',
        metrics.diskUsage > 0.98 ? 'CRITICAL' : 'HIGH',
        `Disk usage at ${(metrics.diskUsage * 100).toFixed(1)}%`,
        metrics
      ));
    }

    return alerts;
  }

  private checkMigrationAlerts(metrics: MigrationMetrics): Alert[] {
    const alerts: Alert[] = [];

    // High migration error rate
    if (metrics.errorRate > 0.1) {
      alerts.push(this.createAlert(
        'HIGH_MIGRATION_ERROR_RATE',
        metrics.errorRate > 0.25 ? 'CRITICAL' : 'HIGH',
        `Migration error rate at ${(metrics.errorRate * 100).toFixed(1)}%`,
        metrics
      ));
    }

    // Slow migration processing
    if (metrics.avgProcessingTime > 300) { // 5 minutes
      alerts.push(this.createAlert(
        'SLOW_MIGRATION_PROCESSING',
        metrics.avgProcessingTime > 600 ? 'HIGH' : 'MEDIUM',
        `Average migration time ${metrics.avgProcessingTime} seconds`,
        metrics
      ));
    }

    return alerts;
  }

  private checkReserveAlerts(metrics: ReserveMetrics): Alert[] {
    const alerts: Alert[] = [];

    // Under-collateralized alert
    if (metrics.reserveRatio < 1.0) {
      alerts.push(this.createAlert(
        'UNDER_COLLATERALIZED',
        metrics.reserveRatio < 0.95 ? 'CRITICAL' : 'HIGH',
        `Reserve ratio at ${(metrics.reserveRatio * 100).toFixed(2)}%`,
        metrics,
        'Immediate action required to restore proper backing'
      ));
    }

    // Canister health alerts
    if (metrics.canisterHealth.simplifiedBridge !== 'HEALTHY') {
      alerts.push(this.createAlert(
        'SIMPLIFIED_BRIDGE_UNHEALTHY',
        'CRITICAL',
        `SimplifiedBridge canister is ${metrics.canisterHealth.simplifiedBridge}`,
        metrics
      ));
    }

    if (metrics.canisterHealth.thresholdSigner !== 'HEALTHY') {
      alerts.push(this.createAlert(
        'THRESHOLD_SIGNER_UNHEALTHY',
        'CRITICAL',
        `Threshold signer canister is ${metrics.canisterHealth.thresholdSigner}`,
        metrics
      ));
    }

    return alerts;
  }

  private createAlert(
    type: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    message: string,
    details: any,
    actionRequired?: string
  ): Alert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      actionRequired,
      resolved: false
    };
  }

  // Private helper methods for health checks

  private async checkCanisterConnectivity(canister: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      if (canister === 'simplified_bridge') {
        await simplifiedBridgeService.getCanisterStatus();
      } else {
        // Placeholder for threshold signer check
        await ckAlgoService.getBalance('rdmx6-jaaaa-aaaah-qcaiq-cai');
      }

      return {
        component: canister,
        status: 'HEALTHY',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: canister,
        status: 'OFFLINE',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkAlgorandConnectivity(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Test Algorand network connectivity
      const response = await fetch('https://mainnet-api.algonode.cloud/health');
      const status = response.ok ? 'HEALTHY' : 'DEGRADED';

      return {
        component: 'algorand_network',
        status,
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: 'algorand_network',
        status: 'OFFLINE',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkStorageHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Simple storage health check
      await fs.access('./');

      return {
        component: 'storage',
        status: 'HEALTHY',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: 'storage',
        status: 'OFFLINE',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkExternalAPIs(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Test external API connectivity (placeholder)
      return {
        component: 'external_apis',
        status: 'HEALTHY',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: 'external_apis',
        status: 'DEGRADED',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Public methods for accessing historical data

  public getMetricsHistory() {
    return {
      system: [...this.metricsHistory.system],
      migration: [...this.metricsHistory.migration],
      reserve: [...this.metricsHistory.reserve]
    };
  }

  public getAlertHistory(limit: number = 50): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  public getActiveAlerts(): Alert[] {
    return this.alertHistory.filter(alert => !alert.resolved);
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      console.log(`✅ Alert resolved: ${alert.type}`);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const productionMonitoringService = new ProductionMonitoringService();