// ckALGO SDK Core Types
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { Principal } from '@dfinity/principal';

// ============================================================================
// Core Platform Types
// ============================================================================

export interface SipparConfig {
  network: 'mainnet' | 'testnet' | 'local';
  canisterId: string;
  backendUrl: string;
  algorandNodeUrl: string;
  thresholdSignerCanisterId: string;
}

export interface UserIdentity {
  principal: Principal;
  algorandAddress?: string;
  tier: UserTier;
  isAuthenticated: boolean;
}

export enum UserTier {
  Free = 'Free',
  Developer = 'Developer',
  Professional = 'Professional',
  Enterprise = 'Enterprise'
}

// ============================================================================
// AI Service Types
// ============================================================================

export enum AIServiceType {
  AlgorandOracle = 'AlgorandOracle',
  OpenWebUIChat = 'OpenWebUIChat',
  RiskAssessment = 'RiskAssessment',
  MarketAnalysis = 'MarketAnalysis'
}

export interface AIRequest {
  serviceType: AIServiceType;
  query: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  context?: Record<string, any>;
}

export interface AIResponse {
  requestId: string;
  response: string;
  confidence?: number;
  modelUsed: string;
  tokensUsed: number;
  costInCkALGO: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AIServiceHealth {
  serviceType: AIServiceType;
  status: 'Healthy' | 'Degraded' | 'Unhealthy' | 'Maintenance';
  responseTime: number;
  successRate: number;
  lastChecked: number;
}

// ============================================================================
// Smart Contract Types
// ============================================================================

export enum ContractStatus {
  Draft = 'Draft',
  Active = 'Active',
  Paused = 'Paused',
  Completed = 'Completed',
  Failed = 'Failed'
}

export enum ContractTriggerType {
  Manual = 'Manual',
  TimeBasedSchedule = 'TimeBasedSchedule',
  PriceThreshold = 'PriceThreshold',
  AIDecision = 'AIDecision',
  CrossChainEvent = 'CrossChainEvent',
  UserAction = 'UserAction',
  ExternalOracle = 'ExternalOracle'
}

export interface SmartContract {
  contractId: string;
  name: string;
  description: string;
  owner: Principal;
  status: ContractStatus;
  triggerType: ContractTriggerType;
  actions: ContractAction[];
  gasLimit: number;
  gasUsed: number;
  createdAt: number;
  lastExecuted?: number;
  executionCount: number;
}

export interface ContractAction {
  actionType: 'transfer' | 'ai_query' | 'mint' | 'balance_check' | 'log_message';
  parameters: Record<string, any>;
  gasCost: number;
}

export interface ContractExecution {
  executionId: string;
  contractId: string;
  triggeredBy: Principal;
  startTime: number;
  endTime?: number;
  status: 'Running' | 'Completed' | 'Failed';
  gasUsed: number;
  results: any[];
  errorMessage?: string;
}

// ============================================================================
// Cross-Chain Types
// ============================================================================

export enum CrossChainOperationType {
  ReadState = 'ReadState',
  WriteState = 'WriteState',
  AlgorandPayment = 'AlgorandPayment',
  AssetTransfer = 'AssetTransfer',
  SmartContractCall = 'SmartContractCall',
  StateSync = 'StateSync',
  BridgeDeposit = 'BridgeDeposit',
  BridgeWithdraw = 'BridgeWithdraw'
}

export enum OperationStatus {
  Pending = 'Pending',
  Signing = 'Signing',
  Broadcasting = 'Broadcasting',
  Confirming = 'Confirming',
  Confirmed = 'Confirmed',
  Failed = 'Failed'
}

export interface CrossChainOperation {
  operationId: string;
  operationType: CrossChainOperationType;
  algorandAddress: string;
  icpPrincipal: Principal;
  amount?: string;
  status: OperationStatus;
  createdAt: number;
  completedAt?: number;
  transactionId?: string;
  errorMessage?: string;
}

export interface AlgorandAccount {
  address: string;
  balance: number;
  assets: AlgorandAsset[];
  applications: number[];
  round: number;
  lastUpdated: number;
}

export interface AlgorandAsset {
  assetId: number;
  amount: number;
  unitName?: string;
  name?: string;
  decimals: number;
}

// ============================================================================
// Revenue & Payment Types
// ============================================================================

export interface PaymentRecord {
  paymentId: string;
  payer: Principal;
  serviceType: string;
  amount: string;
  timestamp: number;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  transactionDetails?: Record<string, any>;
}

export interface RevenueMetrics {
  totalRevenue: string;
  monthlyRevenue: string;
  revenueByService: Record<string, string>;
  totalTransactions: number;
  activeUsers: number;
  averageTransactionValue: string;
}

export interface UserAccount {
  principal: Principal;
  tier: UserTier;
  balance: string;
  totalSpent: string;
  joinedAt: number;
  lastActivity: number;
  preferences?: Record<string, any>;
}

// ============================================================================
// Audit & Compliance Types
// ============================================================================

export interface AuditLogEntry {
  entryId: string;
  timestamp: number;
  operationType: string;
  user: Principal;
  serviceInvolved: string;
  outcome: 'Success' | 'Warning' | 'Failure' | 'Blocked';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  complianceChecks: ComplianceCheck[];
  details?: Record<string, any>;
}

export interface ComplianceCheck {
  checkType: string;
  result: 'Passed' | 'Warning' | 'Failed' | 'RequiresReview';
  score: number;
  details: string;
  timestamp: number;
}

export interface ComplianceReport {
  reportId: string;
  reportType: 'GDPR' | 'SOC2' | 'FinCEN' | 'AML' | 'KYC';
  periodStart: number;
  periodEnd: number;
  complianceScore: number;
  findings: string[];
  recommendations: string[];
  generatedAt: number;
}

// ============================================================================
// SDK Response Types
// ============================================================================

export interface SDKResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SDKError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface SipparEvent {
  eventType: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface ContractEvent extends SipparEvent {
  contractId: string;
  executionId?: string;
}

export interface CrossChainEvent extends SipparEvent {
  operationId: string;
  algorandTxId?: string;
}

export interface AIServiceEvent extends SipparEvent {
  serviceType: AIServiceType;
  requestId: string;
  cost?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SDKConfig {
  sippar: SipparConfig;
  auth: {
    autoLogin: boolean;
    sessionTimeout: number;
  };
  ai: {
    defaultModel: string;
    maxRetries: number;
    timeoutMs: number;
  };
  crossChain: {
    confirmationBlocks: number;
    maxGasPrice: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableAnalytics: boolean;
  };
}