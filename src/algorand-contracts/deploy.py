#!/usr/bin/env python3
"""
Sippar AI Oracle Deployment Script

Deploys the Sippar AI Oracle smart contracts to Algorand testnet/mainnet.
Includes both the main oracle contract and example callback contract.

Prerequisites:
- Python 3.7+
- py-algorand-sdk
- PyTeal
- Algorand node access (via Algod API)

Usage:
    python deploy.py --network testnet --api-token YOUR_TOKEN
    python deploy.py --network mainnet --api-token YOUR_TOKEN --creator-mnemonic "your mnemonic"
"""

import argparse
import base64
import json
import time
from typing import Tuple, Dict, Any

from algosdk import mnemonic, transaction, account, encoding
from algosdk.v2client import algod
from pyteal import *

from sippar_ai_oracle import SipparAIOracle, compile_sippar_ai_oracle
from ai_response_callback import AIResponseCallback, compile_ai_response_callback


class AlgorandDeployer:
    """Handles deployment of smart contracts to Algorand"""
    
    def __init__(self, algod_client: algod.AlgodClient, creator_address: str, creator_private_key: str):
        self.algod_client = algod_client
        self.creator_address = creator_address
        self.creator_private_key = creator_private_key
        
    def compile_contract(self, approval_program: Expr, clear_program: Expr) -> Tuple[bytes, bytes]:
        """Compile PyTeal programs to bytecode"""
        
        # Compile approval program
        approval_teal = compileTeal(approval_program, mode=Mode.Application, version=6)
        approval_result = self.algod_client.compile(approval_teal)
        approval_binary = base64.b64decode(approval_result['result'])
        
        # Compile clear state program
        clear_teal = compileTeal(clear_program, mode=Mode.Application, version=6)
        clear_result = self.algod_client.compile(clear_teal)
        clear_binary = base64.b64decode(clear_result['result'])
        
        return approval_binary, clear_binary
    
    def deploy_contract(
        self, 
        approval_binary: bytes, 
        clear_binary: bytes,
        global_schema: transaction.StateSchema,
        local_schema: transaction.StateSchema,
        app_args: list = None
    ) -> int:
        """Deploy smart contract and return application ID"""
        
        # Get suggested transaction parameters
        suggested_params = self.algod_client.suggested_params()
        
        # Create application creation transaction
        txn = transaction.ApplicationCreateTxn(
            sender=self.creator_address,
            sp=suggested_params,
            on_complete=transaction.OnComplete.NoOpOC,
            approval_program=approval_binary,
            clear_program=clear_binary,
            global_schema=global_schema,
            local_schema=local_schema,
            app_args=app_args or []
        )
        
        # Sign transaction
        signed_txn = txn.sign(self.creator_private_key)
        
        # Submit transaction
        tx_id = self.algod_client.send_transaction(signed_txn)
        print(f"Application creation transaction sent with ID: {tx_id}")
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        app_id = confirmed_txn['application-index']
        
        print(f"Application deployed successfully with ID: {app_id}")
        return app_id
    
    def fund_contract(self, app_id: int, amount_algo: float) -> str:
        """Fund contract with ALGO for operation"""
        
        # Get application address
        app_address = encoding.encode_address(encoding.checksum(b"appID" + app_id.to_bytes(8, 'big')))
        
        # Get suggested parameters
        suggested_params = self.algod_client.suggested_params()
        
        # Create payment transaction
        amount_microalgo = int(amount_algo * 1_000_000)
        txn = transaction.PaymentTxn(
            sender=self.creator_address,
            sp=suggested_params,
            receiver=app_address,
            amt=amount_microalgo
        )
        
        # Sign and send transaction
        signed_txn = txn.sign(self.creator_private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        
        print(f"Contract funded with {amount_algo} ALGO. Transaction ID: {tx_id}")
        return tx_id


def deploy_sippar_ai_oracle(deployer: AlgorandDeployer) -> Dict[str, Any]:
    """Deploy the Sippar AI Oracle contract"""
    
    print("\n=== Deploying Sippar AI Oracle Contract ===")
    
    # Compile contract
    approval_program, clear_program = compile_sippar_ai_oracle()
    approval_binary, clear_binary = deployer.compile_contract(approval_program, clear_program)
    
    # Define state schema
    global_schema = transaction.StateSchema(
        num_uints=2,    # total_requests, credit_price
        num_byte_slices=4  # oracle_admin, available_models, temp_result, temp_service_info
    )
    local_schema = transaction.StateSchema(
        num_uints=2,    # user_credits, whitelisted
        num_byte_slices=0
    )
    
    # Deploy contract
    app_id = deployer.deploy_contract(
        approval_binary=approval_binary,
        clear_binary=clear_binary,
        global_schema=global_schema,
        local_schema=local_schema
    )
    
    # Fund contract for operations
    fund_tx_id = deployer.fund_contract(app_id, 1.0)  # 1 ALGO for operations
    
    return {
        'type': 'oracle',
        'app_id': app_id,
        'creator': deployer.creator_address,
        'fund_tx_id': fund_tx_id,
        'global_schema': {
            'num_uints': global_schema.num_uints,
            'num_byte_slices': global_schema.num_byte_slices
        },
        'local_schema': {
            'num_uints': local_schema.num_uints,
            'num_byte_slices': local_schema.num_byte_slices
        }
    }


def deploy_callback_contract(deployer: AlgorandDeployer, oracle_app_id: int) -> Dict[str, Any]:
    """Deploy example callback contract"""
    
    print("\n=== Deploying AI Response Callback Contract ===")
    
    # Compile callback contract
    approval_program, clear_program = compile_ai_response_callback()
    approval_binary, clear_binary = deployer.compile_contract(approval_program, clear_program)
    
    # Define state schema
    global_schema = transaction.StateSchema(
        num_uints=1,    # response_count
        num_byte_slices=3  # contract_admin, oracle_address, last_response
    )
    local_schema = transaction.StateSchema(
        num_uints=0,
        num_byte_slices=2  # last_query, last_response
    )
    
    # Deploy contract
    app_id = deployer.deploy_contract(
        approval_binary=approval_binary,
        clear_binary=clear_binary,
        global_schema=global_schema,
        local_schema=local_schema
    )
    
    return {
        'type': 'callback',
        'app_id': app_id,
        'oracle_app_id': oracle_app_id,
        'creator': deployer.creator_address,
        'global_schema': {
            'num_uints': global_schema.num_uints,
            'num_byte_slices': global_schema.num_byte_slices
        },
        'local_schema': {
            'num_uints': local_schema.num_uints,
            'num_byte_slices': local_schema.num_byte_slices
        }
    }


def main():
    parser = argparse.ArgumentParser(description='Deploy Sippar AI Oracle contracts')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], required=True,
                      help='Algorand network to deploy to')
    parser.add_argument('--api-token', 
                      help='Algorand API token (not required for testnet with Nodely)')
    parser.add_argument('--api-server', 
                      help='Algorand API server (optional)')
    parser.add_argument('--creator-mnemonic', required=True,
                      help='Creator account mnemonic phrase')
    parser.add_argument('--fund-amount', type=float, default=1.0,
                      help='Amount of ALGO to fund oracle contract (default: 1.0)')
    parser.add_argument('--deploy-callback', action='store_true',
                      help='Also deploy example callback contract')
    
    args = parser.parse_args()
    
    # Network configuration (using free Nodely API)
    if args.network == 'testnet':
        api_server = args.api_server or "https://testnet-api.4160.nodely.dev"
        api_token = ""  # No token required for Nodely free tier
    else:  # mainnet
        api_server = args.api_server or "https://mainnet-api.4160.nodely.dev"  
        api_token = args.api_token or ""  # May need token for mainnet
    
    print(f"Deploying to {args.network}")
    print(f"API Server: {api_server}")
    
    # Initialize algod client (no headers needed for Nodely free tier)
    if args.network == 'testnet':
        algod_client = algod.AlgodClient(api_token, api_server)
    else:
        headers = {"X-API-Key": args.api_token} if args.api_token else {}
        algod_client = algod.AlgodClient(api_token, api_server, headers)
    
    # Get creator account from mnemonic
    creator_private_key = mnemonic.to_private_key(args.creator_mnemonic)
    creator_address = account.address_from_private_key(creator_private_key)
    
    print(f"Creator address: {creator_address}")
    
    # Check creator account balance
    account_info = algod_client.account_info(creator_address)
    balance_algo = account_info['amount'] / 1_000_000
    print(f"Creator balance: {balance_algo} ALGO")
    
    if balance_algo < 2.0:  # Need at least 2 ALGO for deployment + funding
        print("WARNING: Low balance. You may need more ALGO for deployment.")
    
    # Initialize deployer
    deployer = AlgorandDeployer(algod_client, creator_address, creator_private_key)
    
    deployment_results = []
    
    try:
        # Deploy oracle contract
        oracle_result = deploy_sippar_ai_oracle(deployer)
        deployment_results.append(oracle_result)
        
        # Deploy callback contract if requested
        if args.deploy_callback:
            callback_result = deploy_callback_contract(deployer, oracle_result['app_id'])
            deployment_results.append(callback_result)
        
        # Save deployment results
        deployment_info = {
            'network': args.network,
            'timestamp': time.time(),
            'creator_address': creator_address,
            'api_server': api_server,
            'contracts': deployment_results
        }
        
        output_file = f"deployment_{args.network}_{oracle_result['app_id']}.json"
        with open(output_file, 'w') as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"\n=== Deployment Complete ===")
        print(f"Oracle App ID: {oracle_result['app_id']}")
        if args.deploy_callback:
            callback_app_id = next(r['app_id'] for r in deployment_results if r['type'] == 'callback')
            print(f"Callback App ID: {callback_app_id}")
        print(f"Network: {args.network}")
        print(f"Deployment info saved to: {output_file}")
        
        print(f"\n=== Next Steps ===")
        print(f"1. Configure backend with oracle app ID: {oracle_result['app_id']}")
        print(f"2. Start oracle monitoring service")
        print(f"3. Test with example smart contract integration")
        
    except Exception as e:
        print(f"Deployment failed: {e}")
        raise


if __name__ == "__main__":
    main()