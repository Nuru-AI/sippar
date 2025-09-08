#!/usr/bin/env python3
"""
Deploy Oracle Callback Test Contract - Sprint 009 Testing Infrastructure
Deploys the test contract to Algorand testnet for end-to-end Oracle testing

PREREQUISITES:
    pip install py-algorand-sdk
    python oracle-callback-contract.py  # Generate TEAL files first
    
USAGE:
    python deploy-test-contract.py
    
OUTPUTS:
    - Deployed contract on Algorand testnet
    - deployment_info.txt with contract details
"""

import os
import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.future import transaction
from algosdk import constants

# Algorand testnet configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

def create_test_account():
    """Create a test account for contract deployment"""
    private_key, address = account.generate_account()
    passphrase = mnemonic.from_private_key(private_key)
    
    print(f"🔑 Test account created:")
    print(f"   Address: {address}")
    print(f"   Passphrase: {passphrase}")
    print(f"   ⚠️  Fund this account with testnet ALGO before deployment:")
    print(f"   💰 Testnet Dispenser: https://dispenser.testnet.aws.algodev.network/")
    
    return private_key, address

def wait_for_confirmation(client, txid, timeout=10):
    """Wait for transaction confirmation"""
    start_round = client.status()["last-round"] + 1
    current_round = start_round
    
    while current_round < start_round + timeout:
        try:
            pending_txn = client.pending_transaction_info(txid)
            if pending_txn.get("confirmed-round", 0) > 0:
                return pending_txn
        except Exception:
            pass
        client.status_after_block(current_round)
        current_round += 1
    
    raise Exception(f"Transaction not confirmed after {timeout} rounds")

def deploy_contract():
    """Deploy the test Oracle callback contract"""
    
    print("🚀 Deploying Test Oracle Callback Contract to Algorand Testnet")
    print("=" * 60)
    
    # Initialize Algod client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    
    # For testing purposes, create a new account
    # In production, you would use an existing funded account
    print("⚠️  MANUAL STEP REQUIRED:")
    print("1. Create an account and fund it with testnet ALGO")
    print("2. Enter the account details below")
    print()
    
    # Get account details from user (for testing)
    use_existing = input("Do you have a funded testnet account? (y/n): ").lower() == 'y'
    
    if use_existing:
        mnemonic_phrase = input("Enter account mnemonic (25 words): ")
        try:
            private_key = mnemonic.to_private_key(mnemonic_phrase)
            sender_address = account.address_from_private_key(private_key)
        except Exception as e:
            print(f"❌ Invalid mnemonic: {e}")
            return None
    else:
        private_key, sender_address = create_test_account()
        input("⏳ Fund the account above and press Enter to continue...")
    
    print(f"📍 Deploying from account: {sender_address}")
    
    # Check account balance
    try:
        account_info = algod_client.account_info(sender_address)
        balance = account_info["amount"] / 1000000  # Convert microAlgos to Algos
        print(f"💰 Account balance: {balance} ALGO")
        
        if balance < 0.2:  # Need minimum for contract deployment
            print("❌ Insufficient balance. Need at least 0.2 ALGO for deployment.")
            return None
            
    except Exception as e:
        print(f"❌ Error checking account: {e}")
        return None
    
    # Read compiled TEAL files
    try:
        with open("oracle_callback_approval.teal", "r") as f:
            approval_program = f.read()
        with open("oracle_callback_clear_state.teal", "r") as f:
            clear_program = f.read()
    except FileNotFoundError:
        print("❌ TEAL files not found. Run oracle-callback-contract.py first.")
        return None
    
    # Compile programs
    try:
        approval_result = algod_client.compile(approval_program)
        approval_binary = base64.b64decode(approval_result["result"])
        
        clear_result = algod_client.compile(clear_program)
        clear_binary = base64.b64decode(clear_result["result"])
    except Exception as e:
        print(f"❌ Error compiling contracts: {e}")
        return None
    
    # Create application transaction
    params = algod_client.suggested_params()
    
    # Define global and local state schema
    global_schema = transaction.StateSchema(num_uints=3, num_byte_slices=4)
    local_schema = transaction.StateSchema(num_uints=0, num_byte_slices=0)
    
    # Create transaction
    txn = transaction.ApplicationCreateTxn(
        sender=sender_address,
        sp=params,
        on_complete=transaction.OnComplete.NoOpOC.real,
        approval_program=approval_binary,
        clear_program=clear_binary,
        global_schema=global_schema,
        local_schema=local_schema
    )
    
    # Sign transaction
    signed_txn = txn.sign(private_key)
    
    # Submit transaction
    try:
        tx_id = algod_client.send_transaction(signed_txn)
        print(f"📤 Transaction submitted: {tx_id}")
        
        # Wait for confirmation
        confirmed_txn = wait_for_confirmation(algod_client, tx_id, 10)
        
        # Get application ID
        app_id = confirmed_txn["application-index"]
        
        print("✅ Contract deployed successfully!")
        print(f"📋 Application ID: {app_id}")
        print(f"🔗 Transaction ID: {tx_id}")
        print(f"⭕ Confirmed Round: {confirmed_txn['confirmed-round']}")
        
        # Save deployment info
        deployment_info = {
            "app_id": app_id,
            "tx_id": tx_id,
            "creator_address": sender_address,
            "confirmed_round": confirmed_txn['confirmed-round']
        }
        
        with open("deployment_info.txt", "w") as f:
            f.write(f"Test Oracle Callback Contract Deployment\n")
            f.write(f"========================================\n")
            f.write(f"Application ID: {app_id}\n")
            f.write(f"Transaction ID: {tx_id}\n")
            f.write(f"Creator: {sender_address}\n")
            f.write(f"Round: {confirmed_txn['confirmed-round']}\n")
            f.write(f"Oracle Address: EFGDWGG3VS5GTFX7XOI32B5NCYUF5NWTFP2LKLPNQXMWOXGOU2SYD7KOMI\n")
        
        return app_id, tx_id
        
    except Exception as e:
        print(f"❌ Error deploying contract: {e}")
        return None

if __name__ == "__main__":
    result = deploy_contract()
    if result:
        app_id, tx_id = result
        print(f"\n🎯 Next Steps:")
        print(f"1. Test Oracle request to app {app_id}")
        print(f"2. Verify callback response delivery")
        print(f"3. Check contract state for AI response data")
    else:
        print("\n❌ Deployment failed. Check errors above.")