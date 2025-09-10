// ckALGO SDK Smart Contracts Service
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { 
  SmartContract,
  ContractAction,
  ContractExecution,
  ContractStatus,
  ContractTriggerType,
  SDKResponse,
  PaginatedResponse,
  UserTier
} from '../types';

export interface CreateContractRequest {
  name: string;
  description: string;
  triggerType: ContractTriggerType;
  actions: ContractAction[];
  gasLimit: number;
  schedule?: {
    interval: number; // in seconds
    startTime?: number; // timestamp
    endTime?: number; // timestamp
  };
  conditions?: {
    priceThreshold?: number;
    aiConfidenceThreshold?: number;
  };
}

export interface ExecuteContractRequest {
  contractId: string;
  parameters?: Record<string, any>;
  gasLimit?: number;
}

export class SmartContractService {
  private client: any; // SipparClient reference

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Create a new smart contract
   */
  async createContract(request: CreateContractRequest): Promise<SDKResponse<SmartContract>> {
    try {
      // Check authentication
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      // Check authorization for smart contract creation
      const authCheck = await this.client.getAuth().checkAuthorization(
        'smart_contract.create',
        UserTier.Developer
      );
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: 'Smart contract creation requires Developer tier or higher',
          timestamp: Date.now()
        };
      }

      // Validate request
      if (!request.name || request.name.trim().length === 0) {
        return {
          success: false,
          error: 'Contract name is required',
          timestamp: Date.now()
        };
      }

      if (!request.actions || request.actions.length === 0) {
        return {
          success: false,
          error: 'At least one action is required',
          timestamp: Date.now()
        };
      }

      // Get canister actor
      const actor = await this.client.getCanisterActor();

      // Create contract on canister
      const result = await actor.create_smart_contract(
        request.name,
        request.description,
        request.triggerType,
        request.actions,
        request.gasLimit
      );

      if ('Ok' in result) {
        const contract = result.Ok;
        return {
          success: true,
          data: {
            contractId: contract.contract_id,
            name: contract.name,
            description: contract.description,
            owner: contract.owner,
            status: contract.status as ContractStatus,
            triggerType: contract.trigger_type as ContractTriggerType,
            actions: contract.actions,
            gasLimit: Number(contract.gas_limit),
            gasUsed: Number(contract.gas_used),
            createdAt: Number(contract.created_at),
            lastExecuted: contract.last_executed?.[0] ? Number(contract.last_executed[0]) : undefined,
            executionCount: Number(contract.execution_count)
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Failed to create contract',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create contract',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Execute a smart contract
   */
  async executeContract(request: ExecuteContractRequest): Promise<SDKResponse<ContractExecution>> {
    try {
      // Check authentication
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      // Check authorization for smart contract execution
      const authCheck = await this.client.getAuth().checkAuthorization('smart_contract.execute');
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: authCheck.error || 'Not authorized for contract execution',
          timestamp: Date.now()
        };
      }

      // Get canister actor
      const actor = await this.client.getCanisterActor();

      // Execute contract
      const result = await actor.execute_smart_contract(
        request.contractId,
        request.parameters || {},
        request.gasLimit ? [request.gasLimit] : []
      );

      if ('Ok' in result) {
        const execution = result.Ok;
        return {
          success: true,
          data: {
            executionId: execution.execution_id,
            contractId: execution.contract_id,
            triggeredBy: execution.triggered_by,
            startTime: Number(execution.start_time),
            endTime: execution.end_time?.[0] ? Number(execution.end_time[0]) : undefined,
            status: execution.status,
            gasUsed: Number(execution.gas_used),
            results: execution.results,
            errorMessage: execution.error_message?.[0]
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Failed to execute contract',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute contract',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get a smart contract by ID
   */
  async getContract(contractId: string): Promise<SDKResponse<SmartContract>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.get_smart_contract(contractId);

      if (result.length > 0) {
        const contract = result[0];
        return {
          success: true,
          data: {
            contractId: contract.contract_id,
            name: contract.name,
            description: contract.description,
            owner: contract.owner,
            status: contract.status as ContractStatus,
            triggerType: contract.trigger_type as ContractTriggerType,
            actions: contract.actions,
            gasLimit: Number(contract.gas_limit),
            gasUsed: Number(contract.gas_used),
            createdAt: Number(contract.created_at),
            lastExecuted: contract.last_executed?.[0] ? Number(contract.last_executed[0]) : undefined,
            executionCount: Number(contract.execution_count)
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'Contract not found',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get contract',
        timestamp: Date.now()
      };
    }
  }

  /**
   * List user's smart contracts
   */
  async listContracts(page: number = 1, pageSize: number = 10): Promise<SDKResponse<PaginatedResponse<SmartContract>>> {
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
      
      const result = await actor.list_user_smart_contracts(principal, page - 1, pageSize);

      const items = result.contracts.map((contract: any) => ({
        contractId: contract.contract_id,
        name: contract.name,
        description: contract.description,
        owner: contract.owner,
        status: contract.status as ContractStatus,
        triggerType: contract.trigger_type as ContractTriggerType,
        actions: contract.actions,
        gasLimit: Number(contract.gas_limit),
        gasUsed: Number(contract.gas_used),
        createdAt: Number(contract.created_at),
        lastExecuted: contract.last_executed?.[0] ? Number(contract.last_executed[0]) : undefined,
        executionCount: Number(contract.execution_count)
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
        error: error instanceof Error ? error.message : 'Failed to list contracts',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Update contract status (pause, resume, etc.)
   */
  async updateContractStatus(contractId: string, status: ContractStatus): Promise<SDKResponse<string>> {
    try {
      if (!this.client.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const result = await actor.update_smart_contract_status(contractId, status);

      return {
        success: true,
        data: result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update contract status',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get contract execution history
   */
  async getExecutionHistory(
    contractId: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<SDKResponse<PaginatedResponse<ContractExecution>>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.get_contract_execution_history(contractId, page - 1, pageSize);

      const items = result.executions.map((execution: any) => ({
        executionId: execution.execution_id,
        contractId: execution.contract_id,
        triggeredBy: execution.triggered_by,
        startTime: Number(execution.start_time),
        endTime: execution.end_time?.[0] ? Number(execution.end_time[0]) : undefined,
        status: execution.status,
        gasUsed: Number(execution.gas_used),
        results: execution.results,
        errorMessage: execution.error_message?.[0]
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
        error: error instanceof Error ? error.message : 'Failed to get execution history',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get available contract templates
   */
  async getContractTemplates(): Promise<SDKResponse<Array<{
    templateId: string;
    name: string;
    description: string;
    category: string;
    difficulty: string;
    estimatedGas: number;
    actions: ContractAction[];
  }>>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.get_contract_templates();

      const templates = result.map((template: any) => ({
        templateId: template.template_id,
        name: template.name,
        description: template.description,
        category: template.category,
        difficulty: template.difficulty,
        estimatedGas: Number(template.estimated_gas),
        actions: template.actions
      }));

      return {
        success: true,
        data: templates,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get contract templates',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Create contract from template
   */
  async createFromTemplate(
    templateId: string,
    name: string,
    customizations?: Record<string, any>
  ): Promise<SDKResponse<SmartContract>> {
    try {
      // Check authorization
      const authCheck = await this.client.getAuth().checkAuthorization(
        'smart_contract.template',
        UserTier.Professional
      );
      if (!authCheck.success || !authCheck.data) {
        return {
          success: false,
          error: 'Contract templates require Professional tier or higher',
          timestamp: Date.now()
        };
      }

      const actor = await this.client.getCanisterActor();
      const result = await actor.create_contract_from_template(
        templateId,
        name,
        customizations || {}
      );

      if ('Ok' in result) {
        const contract = result.Ok;
        return {
          success: true,
          data: {
            contractId: contract.contract_id,
            name: contract.name,
            description: contract.description,
            owner: contract.owner,
            status: contract.status as ContractStatus,
            triggerType: contract.trigger_type as ContractTriggerType,
            actions: contract.actions,
            gasLimit: Number(contract.gas_limit),
            gasUsed: Number(contract.gas_used),
            createdAt: Number(contract.created_at),
            lastExecuted: contract.last_executed?.[0] ? Number(contract.last_executed[0]) : undefined,
            executionCount: Number(contract.execution_count)
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.Err || 'Failed to create contract from template',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create contract from template',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Estimate gas for contract execution
   */
  async estimateGas(contractId: string, parameters?: Record<string, any>): Promise<SDKResponse<number>> {
    try {
      const actor = await this.client.getCanisterActor();
      const result = await actor.estimate_contract_gas(contractId, parameters || {});

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