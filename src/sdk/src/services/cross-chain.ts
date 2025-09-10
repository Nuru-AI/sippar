// ckALGO SDK Cross-Chain Service
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { 
  CrossChainOperation,
  CrossChainOperationType,
  OperationStatus,
  AlgorandAccount,
  SDKResponse,
  PaginatedResponse,
  UserTier
} from '../types';

export interface CrossChainTransferRequest {
  toAddress: string;
  amount: string;
  assetId?: number;
  note?: string;
}

export interface StateReadRequest {
  address: string;
  stateType: 'account' | 'asset' | 'application';
  assetId?: number;
  appId?: number;
}

export class CrossChainService {
  private client: any; // SipparClient reference

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Read Algorand state (account, asset, application)
   */
  async readState(request: StateReadRequest): Promise<SDKResponse<any>> {
    try {
      // Check authentication
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      // Check authorization for cross-chain operations
      const authCheck = await this.client.getAuth().checkAuthorization('cross_chain.read_state');
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: authCheck.error || 'Not authorized for cross-chain operations',
          timestamp: Date.now()
        };
      }

      // Get canister actor
      const actor = await this.client.getCanisterActor();

      let result;
      switch (request.stateType) {
        case 'account':
          result = await actor.read_algorand_state(
            request.address,
            { AccountState: null }
          );
          break;
        case 'asset':
          if (!request.assetId) {
            return {
              success: false,
              error: 'Asset ID is required for asset state queries',
              timestamp: Date.now()
            };
          }
          result = await actor.read_algorand_state(
            request.address,
            { AssetState: request.assetId }
          );
          break;
        case 'application':
          if (!request.appId) {
            return {
              success: false,
              error: 'Application ID is required for application state queries',
              timestamp: Date.now()
            };
          }
          result = await actor.read_algorand_state(
            request.address,
            { ApplicationState: request.appId }
          );
          break;
        default:
          return {
            success: false,
            error: `Unsupported state type: ${request.stateType}`,
            timestamp: Date.now()
          };
      }

      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok,
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Failed to read state',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read state',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Transfer ALGO or Algorand assets
   */
  async transfer(request: CrossChainTransferRequest): Promise<SDKResponse<CrossChainOperation>> {
    try {
      // Check authentication
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      // Check authorization for cross-chain writes
      const authCheck = await this.client.getAuth().checkAuthorization(
        'cross_chain.write_state',
        UserTier.Developer
      );
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: 'Cross-chain transfers require Developer tier or higher',
          timestamp: Date.now()
        };
      }

      // Validate request
      if (!request.toAddress || !request.amount) {
        return {
          success: false,
          error: 'Destination address and amount are required',
          timestamp: Date.now()
        };
      }

      // Get canister actor
      const actor = await this.client.getCanisterActor();

      const operationType = request.assetId 
        ? CrossChainOperationType.AssetTransfer 
        : CrossChainOperationType.AlgorandPayment;

      const algorandOperation = {
        operation_type: operationType,
        target_address: request.toAddress,
        amount: [BigInt(request.amount)],
        asset_id: request.assetId ? [request.assetId] : [],
        note: request.note ? [Array.from(new TextEncoder().encode(request.note))] : [],
        gas_limit: [5000] // Default gas limit
      };

      const result = await actor.write_algorand_state(
        algorandOperation,
        { /* authorization params */ }
      );

      if ('Ok' in result) {
        const operation = result.Ok;
        return {
          success: true,
          data: {
            operationId: operation.operation_id,
            operationType: operation.operation_type as CrossChainOperationType,
            algorandAddress: operation.algorand_address,
            icpPrincipal: operation.icp_principal,
            amount: operation.amount?.[0]?.toString(),
            status: operation.status as OperationStatus,
            createdAt: Number(operation.created_at),
            completedAt: operation.completed_at?.[0] ? Number(operation.completed_at[0]) : undefined,
            transactionId: operation.transaction_id?.[0],
            errorMessage: operation.error_message?.[0]
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Failed to initiate transfer',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get cross-chain operation status
   */
  async getOperationStatus(operationId: string): Promise<SDKResponse<CrossChainOperation>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.get_cross_chain_operation(operationId);

      if (result.length > 0) {
        const operation = result[0];
        return {
          success: true,
          data: {
            operationId: operation.operation_id,
            operationType: operation.operation_type as CrossChainOperationType,
            algorandAddress: operation.algorand_address,
            icpPrincipal: operation.icp_principal,
            amount: operation.amount?.[0]?.toString(),
            status: operation.status as OperationStatus,
            createdAt: Number(operation.created_at),
            completedAt: operation.completed_at?.[0] ? Number(operation.completed_at[0]) : undefined,
            transactionId: operation.transaction_id?.[0],
            errorMessage: operation.error_message?.[0]
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'Operation not found',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get operation status',
        timestamp: Date.now()
      };
    }
  }

  /**
   * List user's cross-chain operations
   */
  async listOperations(
    page: number = 1, 
    pageSize: number = 10,
    status?: OperationStatus
  ): Promise<SDKResponse<PaginatedResponse<CrossChainOperation>>> {
    try {
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const principal = this.client.getAuth().getPrincipal()!;
      
      const result = await actor.list_user_cross_chain_operations(
        principal, 
        page - 1, 
        pageSize,
        status ? [status] : []
      );

      const items = result.operations.map((operation: any) => ({
        operationId: operation.operation_id,
        operationType: operation.operation_type as CrossChainOperationType,
        algorandAddress: operation.algorand_address,
        icpPrincipal: operation.icp_principal,
        amount: operation.amount?.[0]?.toString(),
        status: operation.status as OperationStatus,
        createdAt: Number(operation.created_at),
        completedAt: operation.completed_at?.[0] ? Number(operation.completed_at[0]) : undefined,
        transactionId: operation.transaction_id?.[0],
        errorMessage: operation.error_message?.[0]
      }));

      return {
        success: true,
        data: {
          items,
          total: Number(result.total_count),
          page,
          pageSize,
          hasMore: result.has_more
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list operations',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Synchronize cross-chain state
   */
  async syncState(addresses: string[]): Promise<SDKResponse<string[]>> {
    try {
      const authCheck = await this.client.getAuth().checkAuthorization(
        'cross_chain.sync_state',
        UserTier.Professional
      );
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: 'State synchronization requires Professional tier or higher',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const result = await actor.sync_cross_chain_state(addresses);

      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok,
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Failed to sync state',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync state',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get cached Algorand account data
   */
  async getCachedAccount(address: string): Promise<SDKResponse<AlgorandAccount>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.get_cached_algorand_state(address);

      if (result.length > 0) {
        const state = result[0];
        return {
          success: true,
          data: {
            address: state.address,
            balance: Number(state.balance),
            assets: state.assets.map((asset: any) => ({
              assetId: Number(asset.asset_id),
              amount: Number(asset.amount),
              unitName: asset.unit_name?.[0],
              name: asset.name?.[0],
              decimals: Number(asset.decimals)
            })),
            applications: state.apps.map((app: any) => Number(app)),
            round: Number(state.round),
            lastUpdated: Number(state.last_updated)
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'Account not found in cache',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cached account',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Estimate gas for cross-chain operation
   */
  async estimateGas(
    operationType: CrossChainOperationType,
    amount?: string
  ): Promise<SDKResponse<number>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.calculate_cross_chain_gas_fee(
        operationType,
        amount ? [BigInt(amount)] : []
      );

      return {
        success: true,
        data: Number(result),
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to estimate gas',
        timestamp: Date.now()
      };
    }
  }
}