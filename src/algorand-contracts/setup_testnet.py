#!/usr/bin/env python3
"""
Algorand Testnet Setup Script

Creates a new testnet account and provides instructions for getting testnet ALGO tokens.
Uses free Nodely API service (no API token required).

Usage:
    python setup_testnet.py
"""

from algosdk import account, mnemonic
from algosdk.v2client import algod
import json
import os


def create_test_account():
    """Create new Algorand testnet account"""
    print("🔐 Creating new Algorand testnet account...")
    
    # Generate new account
    private_key, address = account.generate_account()
    account_mnemonic = mnemonic.from_private_key(private_key)
    
    print(f"✅ Account created successfully!")
    print(f"Address: {address}")
    print(f"Private Key: {private_key}")
    print(f"Mnemonic: {account_mnemonic}")
    
    return {
        'address': address,
        'private_key': private_key,
        'mnemonic': account_mnemonic
    }


def test_nodely_connection():
    """Test connection to Nodely free API"""
    print("\n🌐 Testing connection to Nodely Algorand API...")
    
    # Nodely free testnet endpoint (no API token required)
    algod_address = "https://testnet-api.4160.nodely.dev"
    algod_token = ""  # No token required for free tier
    
    try:
        # Create algod client
        algod_client = algod.AlgodClient(algod_token, algod_address)
        
        # Test connection
        status = algod_client.status()
        print(f"✅ Connected to Algorand testnet successfully!")
        print(f"Network: {status.get('network', 'unknown')}")
        print(f"Current round: {status.get('last-round', 'unknown')}")
        print(f"Genesis ID: {status.get('genesis-id', 'unknown')}")
        
        return True, algod_address, algod_token
        
    except Exception as e:
        print(f"❌ Failed to connect to Nodely API: {e}")
        return False, None, None


def check_account_balance(address, algod_client):
    """Check account balance on testnet"""
    try:
        account_info = algod_client.account_info(address)
        balance_algo = account_info['amount'] / 1_000_000  # Convert microALGO to ALGO
        print(f"💰 Account balance: {balance_algo} ALGO")
        return balance_algo
    except Exception as e:
        print(f"⚠️  Could not check balance (account may not be funded yet): {e}")
        return 0


def save_account_config(account_data, api_config):
    """Save account and API configuration"""
    config = {
        'testnet_account': account_data,
        'api_config': api_config,
        'created_at': '2025-09-04',
        'network': 'testnet'
    }
    
    config_file = 'testnet_config.json'
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"💾 Configuration saved to: {config_file}")
    return config_file


def main():
    print("🧪 Algorand Testnet Setup for Sippar AI Oracle")
    print("=" * 50)
    
    # Step 1: Test API connection
    api_connected, algod_address, algod_token = test_nodely_connection()
    if not api_connected:
        print("❌ Cannot proceed without API connection")
        return
    
    # Step 2: Create test account
    account_data = create_test_account()
    
    # Step 3: Create algod client for balance checking
    algod_client = algod.AlgodClient(algod_token, algod_address)
    
    # Step 4: Check initial balance (will be 0)
    initial_balance = check_account_balance(account_data['address'], algod_client)
    
    # Step 5: Save configuration
    api_config = {
        'algod_address': algod_address,
        'algod_token': algod_token,
        'indexer_address': 'https://testnet-idx.4160.nodely.dev',
        'indexer_token': ''
    }
    
    config_file = save_account_config(account_data, api_config)
    
    # Step 6: Instructions for getting testnet tokens
    print(f"\n🪙 NEXT STEPS - Get Testnet ALGO Tokens:")
    print("=" * 50)
    print(f"1. Visit the Algorand Testnet Dispenser:")
    print(f"   https://bank.testnet.algorand.network/")
    print(f"")
    print(f"2. Enter your testnet address:")
    print(f"   {account_data['address']}")
    print(f"")
    print(f"3. Complete reCAPTCHA and click 'Dispense'")
    print(f"   (You'll get 5 ALGO every 24 hours)")
    print(f"")
    print(f"4. Alternative faucets:")
    print(f"   - Triangle: https://faucet.triangleplatform.com/algorand/testnet")
    print(f"   - Circle: https://faucet.circle.com/")
    print(f"")
    print(f"5. After funding, you can deploy the oracle contract:")
    print(f"   python deploy.py --network testnet --api-token '' \\")
    print(f"     --creator-mnemonic '{account_data['mnemonic']}' \\")
    print(f"     --deploy-callback")
    print(f"")
    print(f"💾 Account details saved in: {config_file}")
    print(f"🔐 Keep your mnemonic secure - you'll need it for deployment!")
    
    # Step 7: Wait and check if account gets funded
    print(f"\n⏳ Checking if account gets funded (waiting 30 seconds)...")
    import time
    time.sleep(30)
    
    final_balance = check_account_balance(account_data['address'], algod_client)
    if final_balance > 0:
        print(f"🎉 Account funded successfully! Ready for deployment.")
    else:
        print(f"💡 Account not funded yet. Use the faucet links above to get testnet ALGO.")


if __name__ == "__main__":
    main()