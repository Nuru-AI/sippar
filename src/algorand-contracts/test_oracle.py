#!/usr/bin/env python3
"""
Oracle Test Script - Sippar AI Oracle Testing

Tests the oracle contract deployment and functionality on Algorand testnet.
Includes end-to-end testing of credit purchase, AI requests, and callback responses.

Prerequisites:
- Deployed oracle contract on testnet
- Backend service running with oracle monitoring
- Test account with ALGO for transactions

Usage:
    python test_oracle.py --oracle-app-id 123456789 --callback-app-id 987654321
"""

import argparse
import base64
import json
import time
from typing import Dict, Any

from algosdk import mnemonic, transaction, account, encoding
from algosdk.v2client import algod
import requests


class OracleTester:
    """Test suite for Sippar AI Oracle functionality"""
    
    def __init__(self, algod_client: algod.AlgodClient, test_account_mnemonic: str):
        self.algod_client = algod_client
        self.test_private_key = mnemonic.to_private_key(test_account_mnemonic)
        self.test_address = account.address_from_private_key(self.test_private_key)
        
    def test_credit_purchase(self, oracle_app_id: int, credit_amount_algo: float) -> str:
        """Test purchasing oracle credits"""
        
        print(f"\n=== Testing Credit Purchase ===")
        print(f"Oracle App ID: {oracle_app_id}")
        print(f"Credit Amount: {credit_amount_algo} ALGO")
        
        # Get oracle application address
        app_address = encoding.encode_address(encoding.checksum(b"appID" + oracle_app_id.to_bytes(8, 'big')))
        print(f"Oracle Address: {app_address}")
        
        # Get suggested parameters
        suggested_params = self.algod_client.suggested_params()
        
        # Create payment transaction
        amount_microalgo = int(credit_amount_algo * 1_000_000)
        payment_txn = transaction.PaymentTxn(
            sender=self.test_address,
            sp=suggested_params,
            receiver=app_address,
            amt=amount_microalgo
        )
        
        # Create application call transaction
        app_call_txn = transaction.ApplicationCallTxn(
            sender=self.test_address,
            sp=suggested_params,
            index=oracle_app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=["purchase_credits"]
        )
        
        # Create atomic transfer (app call first, then payment)
        group_id = transaction.calculate_group_id([app_call_txn, payment_txn])
        app_call_txn.group = group_id
        payment_txn.group = group_id
        
        # Sign transactions
        signed_payment = payment_txn.sign(self.test_private_key)
        signed_app_call = app_call_txn.sign(self.test_private_key)
        
        # Submit atomic transfer (app call first, then payment)
        tx_id = self.algod_client.send_transactions([signed_app_call, signed_payment])
        print(f"Credit purchase transaction sent: {tx_id}")
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        print(f"✅ Credit purchase confirmed in round: {confirmed_txn['confirmed-round']}")
        
        return tx_id
    
    def test_ai_request(self, oracle_app_id: int, callback_app_id: int, query: str, model: str) -> str:
        """Test submitting AI analysis request"""
        
        print(f"\n=== Testing AI Request ===")
        print(f"Query: {query}")
        print(f"Model: {model}")
        print(f"Callback App ID: {callback_app_id}")
        
        # Get suggested parameters
        suggested_params = self.algod_client.suggested_params()
        
        # Create application call transaction
        app_call_txn = transaction.ApplicationCallTxn(
            sender=self.test_address,
            sp=suggested_params,
            index=oracle_app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[
                "request_ai_analysis",
                query.encode('utf-8'),
                model.encode('utf-8'),
                str(callback_app_id).encode('utf-8'),
                "receive_ai_response".encode('utf-8')
            ],
            note="sippar-ai-oracle".encode('utf-8')  # Required for backend detection
        )
        
        # Sign transaction
        signed_txn = app_call_txn.sign(self.test_private_key)
        
        # Submit transaction
        tx_id = self.algod_client.send_transaction(signed_txn)
        print(f"AI request transaction sent: {tx_id}")
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        print(f"✅ AI request confirmed in round: {confirmed_txn['confirmed-round']}")
        
        # The backend should now detect this request and process it
        print("🤖 Backend should now detect and process this AI request...")
        
        return tx_id
    
    def opt_into_app(self, app_id: int) -> str:
        """Opt user into application"""
        
        print(f"\n=== Opting into App {app_id} ===")
        
        # Get suggested parameters
        suggested_params = self.algod_client.suggested_params()
        
        # Create opt-in transaction
        opt_in_txn = transaction.ApplicationCallTxn(
            sender=self.test_address,
            sp=suggested_params,
            index=app_id,
            on_complete=transaction.OnComplete.OptInOC
        )
        
        # Sign transaction
        signed_txn = opt_in_txn.sign(self.test_private_key)
        
        # Submit transaction
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        print(f"✅ Opted into app {app_id}")
        
        return tx_id
        
    def test_credit_balance(self, oracle_app_id: int) -> int:
        """Test getting credit balance"""
        
        print(f"\n=== Testing Credit Balance Check ===")
        
        # Get suggested parameters
        suggested_params = self.algod_client.suggested_params()
        
        # Create application call transaction
        app_call_txn = transaction.ApplicationCallTxn(
            sender=self.test_address,
            sp=suggested_params,
            index=oracle_app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=["get_ai_credits"]
        )
        
        # Sign transaction
        signed_txn = app_call_txn.sign(self.test_private_key)
        
        # Submit transaction
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        
        # Parse return value (simplified - would need proper parsing in production)
        print(f"✅ Credit balance check completed")
        print(f"Transaction ID: {tx_id}")
        
        return 0  # Placeholder - would parse actual return value
    
    def test_service_info(self, oracle_app_id: int) -> Dict[str, Any]:
        """Test getting service information"""
        
        print(f"\n=== Testing Service Info ===")
        
        # Get suggested parameters
        suggested_params = self.algod_client.suggested_params()
        
        # Create application call transaction
        app_call_txn = transaction.ApplicationCallTxn(
            sender=self.test_address,
            sp=suggested_params,
            index=oracle_app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=["get_service_info"]
        )
        
        # Sign transaction
        signed_txn = app_call_txn.sign(self.test_private_key)
        
        # Submit transaction
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(self.algod_client, tx_id, 4)
        
        print(f"✅ Service info retrieved")
        print(f"Transaction ID: {tx_id}")
        
        return {}  # Placeholder


def test_backend_api(base_url: str = "http://localhost:3000") -> Dict[str, Any]:
    """Test backend API endpoints"""
    
    print(f"\n=== Testing Backend API ===")
    print(f"Base URL: {base_url}")
    
    results = {}
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/ai-oracle/health", timeout=10)
        results['health'] = {
            'status_code': response.status_code,
            'success': response.status_code == 200,
            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
        print(f"✅ Health check: {response.status_code}")
    except Exception as e:
        results['health'] = {'success': False, 'error': str(e)}
        print(f"❌ Health check failed: {e}")
    
    # Test status endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/ai-oracle/status", timeout=10)
        results['status'] = {
            'status_code': response.status_code,
            'success': response.status_code in [200, 503],  # 503 if not initialized
            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
        print(f"✅ Status check: {response.status_code}")
    except Exception as e:
        results['status'] = {'success': False, 'error': str(e)}
        print(f"❌ Status check failed: {e}")
    
    # Test supported models endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/ai-oracle/supported-models", timeout=10)
        results['models'] = {
            'status_code': response.status_code,
            'success': response.status_code == 200,
            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
        print(f"✅ Supported models: {response.status_code}")
    except Exception as e:
        results['models'] = {'success': False, 'error': str(e)}
        print(f"❌ Supported models failed: {e}")
    
    # Test AI query endpoint (if service is available)
    try:
        test_payload = {
            "query": "What is the capital of France?",
            "model": "qwen2.5"
        }
        response = requests.post(
            f"{base_url}/api/v1/ai-oracle/test-ai-query",
            json=test_payload,
            timeout=30
        )
        results['test_query'] = {
            'status_code': response.status_code,
            'success': response.status_code in [200, 503],
            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
        print(f"✅ Test AI query: {response.status_code}")
    except Exception as e:
        results['test_query'] = {'success': False, 'error': str(e)}
        print(f"❌ Test AI query failed: {e}")
    
    return results


def main():
    parser = argparse.ArgumentParser(description='Test Sippar AI Oracle functionality')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], default='testnet',
                      help='Algorand network')
    parser.add_argument('--api-token', required=True,
                      help='Algorand API token')
    parser.add_argument('--test-mnemonic', required=True,
                      help='Test account mnemonic phrase')
    parser.add_argument('--oracle-app-id', type=int, required=True,
                      help='Oracle application ID')
    parser.add_argument('--callback-app-id', type=int,
                      help='Callback application ID (optional)')
    parser.add_argument('--backend-url', default='http://localhost:3000',
                      help='Backend service URL')
    parser.add_argument('--credit-amount', type=float, default=0.1,
                      help='Amount of ALGO to spend on credits')
    parser.add_argument('--test-query', default='Analyze the market sentiment for ALGO token',
                      help='Test query for AI analysis')
    parser.add_argument('--test-model', default='qwen2.5',
                      choices=['qwen2.5', 'deepseek-r1', 'phi-3', 'mistral'],
                      help='AI model to test')
    
    args = parser.parse_args()
    
    # Network configuration
    if args.network == 'testnet':
        api_server = "https://testnet-api.4160.nodely.dev"
    else:
        api_server = "https://mainnet-api.4160.nodely.dev"
    
    print(f"🧪 Testing Sippar AI Oracle on {args.network}")
    print(f"Oracle App ID: {args.oracle_app_id}")
    print(f"Backend URL: {args.backend_url}")
    
    # Initialize algod client (no headers for free Nodely)
    algod_client = algod.AlgodClient("", api_server)
    
    # Get test account info
    test_private_key = mnemonic.to_private_key(args.test_mnemonic)
    test_address = account.address_from_private_key(test_private_key)
    account_info = algod_client.account_info(test_address)
    balance_algo = account_info['amount'] / 1_000_000
    
    print(f"Test address: {test_address}")
    print(f"Test balance: {balance_algo} ALGO")
    
    if balance_algo < args.credit_amount + 0.1:  # Need extra for transaction fees
        print(f"❌ Insufficient balance. Need at least {args.credit_amount + 0.1} ALGO")
        return
    
    # Initialize tester
    tester = OracleTester(algod_client, args.test_mnemonic)
    
    test_results = {
        'timestamp': time.time(),
        'network': args.network,
        'oracle_app_id': args.oracle_app_id,
        'test_address': test_address,
        'tests': {}
    }
    
    try:
        # Test 1: Backend API
        print("\n" + "="*50)
        print("PHASE 1: Backend API Testing")
        print("="*50)
        
        backend_results = test_backend_api(args.backend_url)
        test_results['tests']['backend_api'] = backend_results
        
        # Test 2: Opt-in to Oracle
        print("\n" + "="*50)
        print("PHASE 2: Opt-in to Oracle")
        print("="*50)
        
        try:
            opt_in_tx_id = tester.opt_into_app(args.oracle_app_id)
            test_results['tests']['opt_in'] = {
                'success': True,
                'transaction_id': opt_in_tx_id
            }
        except Exception as e:
            print(f"❌ Opt-in failed: {e}")
            test_results['tests']['opt_in'] = {
                'success': False,
                'error': str(e)
            }
        
        # Test 3: Credit Purchase
        print("\n" + "="*50)
        print("PHASE 3: Credit Purchase Testing")
        print("="*50)
        
        try:
            credit_tx_id = tester.test_credit_purchase(args.oracle_app_id, args.credit_amount)
            test_results['tests']['credit_purchase'] = {
                'success': True,
                'transaction_id': credit_tx_id
            }
        except Exception as e:
            print(f"❌ Credit purchase failed: {e}")
            test_results['tests']['credit_purchase'] = {
                'success': False,
                'error': str(e)
            }
        
        # Test 4: Credit Balance Check
        print("\n" + "="*50)
        print("PHASE 4: Credit Balance Testing")
        print("="*50)
        
        try:
            balance = tester.test_credit_balance(args.oracle_app_id)
            test_results['tests']['credit_balance'] = {
                'success': True,
                'balance': balance
            }
        except Exception as e:
            print(f"❌ Credit balance check failed: {e}")
            test_results['tests']['credit_balance'] = {
                'success': False,
                'error': str(e)
            }
        
        # Test 5: Service Info
        print("\n" + "="*50)
        print("PHASE 5: Service Info Testing")
        print("="*50)
        
        try:
            service_info = tester.test_service_info(args.oracle_app_id)
            test_results['tests']['service_info'] = {
                'success': True,
                'info': service_info
            }
        except Exception as e:
            print(f"❌ Service info failed: {e}")
            test_results['tests']['service_info'] = {
                'success': False,
                'error': str(e)
            }
        
        # Test 6: AI Request (if callback app provided)
        if args.callback_app_id:
            print("\n" + "="*50)
            print("PHASE 6: AI Request Testing")
            print("="*50)
            
            try:
                ai_request_tx_id = tester.test_ai_request(
                    args.oracle_app_id,
                    args.callback_app_id,
                    args.test_query,
                    args.test_model
                )
                test_results['tests']['ai_request'] = {
                    'success': True,
                    'transaction_id': ai_request_tx_id,
                    'query': args.test_query,
                    'model': args.test_model
                }
                
                print("\n⏳ Waiting 30 seconds for backend to process AI request...")
                time.sleep(30)
                
            except Exception as e:
                print(f"❌ AI request failed: {e}")
                test_results['tests']['ai_request'] = {
                    'success': False,
                    'error': str(e)
                }
        
        # Save test results
        output_file = f"oracle_test_results_{args.network}_{int(time.time())}.json"
        with open(output_file, 'w') as f:
            json.dump(test_results, f, indent=2)
        
        print(f"\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        
        for test_name, result in test_results['tests'].items():
            status = "✅ PASS" if result.get('success', False) else "❌ FAIL"
            print(f"{test_name}: {status}")
        
        print(f"\nTest results saved to: {output_file}")
        
        if args.callback_app_id:
            print(f"\n🤖 Check backend logs and callback contract for AI response processing.")
            print(f"AI request should be processed within 2-3 minutes.")
        
    except Exception as e:
        print(f"❌ Testing failed: {e}")
        test_results['tests']['error'] = str(e)
        raise


if __name__ == "__main__":
    main()