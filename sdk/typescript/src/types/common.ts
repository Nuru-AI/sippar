import { Principal } from '@dfinity/principal';

/**
 * Common types used across the Sippar SDK
 */

export type Network = 'mainnet' | 'testnet' | 'local';

export interface SipparConfig {
  network: Network;
  canisterId: string;
  backendUrl: string;
  timeout: number;
}

export interface BaseResponse {
  success: boolean;
  timestamp: string;
  error?: string;
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends BaseResponse {
  data: T[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface UserPrincipal {
  principal: Principal;
  algorandAddress?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  blockHeight?: number;
  timestamp: string;
  error?: string;
}