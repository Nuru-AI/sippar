import { BaseResponse } from './common';

/**
 * AI Service Types
 */

export type AIServiceType = 'general' | 'oracle' | 'enhanced' | 'chat';

export interface AIQuery {
  query: string;
  userPrincipal: string;
  serviceType?: AIServiceType;
  algorandData?: Record<string, any>;
}

export interface AIResponseData {
  query: string;
  response: string;
  serviceType: string;
  userPrincipal: string;
  responseTime: number;
  model: string;
  confidence?: number;
  tokens?: {
    input: number;
    output: number;
  };
  cached?: boolean;
  metadata?: {
    tier?: string;
    features?: string[];
  };
  // Oracle-specific fields
  appId?: number;
  sources?: string[];
  oracleResponse?: string;
  algorandData?: Record<string, any>;
}

export interface AIResponse extends BaseResponse {
  data: AIResponseData;
}

export interface ChatAuthRequest {
  userPrincipal: string;
  algorandAddress?: string;
}

export interface ChatAuthResponse extends BaseResponse {
  authUrl: string;
  expires: number;
  models: string[];
}

export interface AIHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: string;
  responseTime: number;
  version: string;
  services?: {
    openwebui?: {
      status: string;
      endpoint: string;
      responseTime: number;
    };
    oracle?: {
      status: string;
      appId: number;
      responseTime: number;
    };
  };
}