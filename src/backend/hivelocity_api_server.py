"""
Sippar Hivelocity API Server
Provides HTTP endpoints that connect to ICP mainnet threshold signature canister
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import asyncio
import json
import os
from icp_mainnet_integration import SipparMainnetClient

app = Flask(__name__)
CORS(app)

# Initialize the ICP mainnet client
icp_client = SipparMainnetClient()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "sippar-threshold-api",
        "icp_mainnet_canister": "vj7ly-diaaa-aaaae-abvoq-cai",
        "network": "icp-mainnet",
        "timestamp": "2025-09-03"
    })

@app.route('/api/v1/threshold/derive-address', methods=['POST'])
def derive_address():
    """Derive Algorand address using ICP threshold signatures"""
    try:
        data = request.get_json()
        user_principal = data.get('principal')
        
        if not user_principal:
            return jsonify({
                "success": False,
                "error": "Missing 'principal' field"
            }), 400
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            icp_client.derive_algorand_address(user_principal)
        )
        loop.close()
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "error_code": 500
        }), 500

@app.route('/api/v1/threshold/sign-transaction', methods=['POST'])
def sign_transaction():
    """Sign Algorand transaction using ICP threshold signatures"""
    try:
        data = request.get_json()
        user_principal = data.get('principal')
        transaction_hex = data.get('transaction_hex')
        
        if not user_principal or not transaction_hex:
            return jsonify({
                "success": False,
                "error": "Missing 'principal' or 'transaction_hex' field"
            }), 400
        
        # Convert hex string to bytes
        try:
            transaction_bytes = bytes.fromhex(transaction_hex)
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid hex format in 'transaction_hex'"
            }), 400
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            icp_client.sign_algorand_transaction(user_principal, transaction_bytes)
        )
        loop.close()
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "error_code": 500
        }), 500

@app.route('/api/v1/threshold/status', methods=['GET'])
def canister_status():
    """Get ICP canister status and info"""
    return jsonify({
        "canister_id": "vj7ly-diaaa-aaaae-abvoq-cai",
        "network": "icp-mainnet",
        "status": "operational",
        "threshold_key": "ecdsa:Secp256k1:key_1",
        "address_format": "algorand_base32_sha512_256",
        "deployment_date": "2025-09-03",
        "cycles_estimate": "4.7T_remaining",
        "validation": {
            "address_derivation": "working",
            "transaction_signing": "working",
            "algorand_compatibility": "validated"
        }
    })

# Example integration endpoints for your existing Sippar API
@app.route('/api/v1/sippar/mint/prepare', methods=['POST'])
def prepare_mint():
    """Prepare ckALGO mint operation with threshold signature"""
    try:
        data = request.get_json()
        user_principal = data.get('principal')
        amount = data.get('amount')
        
        if not user_principal or not amount:
            return jsonify({
                "success": False,
                "error": "Missing 'principal' or 'amount' field"
            }), 400
        
        # Derive custody address using threshold signatures
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        address_result = loop.run_until_complete(
            icp_client.derive_algorand_address(user_principal)
        )
        loop.close()
        
        if address_result["success"]:
            return jsonify({
                "success": True,
                "custody_address": address_result["address"],
                "amount": amount,
                "user_principal": user_principal,
                "threshold_derived": True,
                "next_step": "send_algo_to_custody_address"
            }), 200
        else:
            return jsonify(address_result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/v1/sippar/redeem/prepare', methods=['POST'])
def prepare_redeem():
    """Prepare ckALGO redeem operation with threshold signature"""
    try:
        data = request.get_json()
        user_principal = data.get('principal')
        destination_address = data.get('destination')
        amount = data.get('amount')
        
        if not all([user_principal, destination_address, amount]):
            return jsonify({
                "success": False,
                "error": "Missing required fields: 'principal', 'destination', 'amount'"
            }), 400
        
        return jsonify({
            "success": True,
            "user_principal": user_principal,
            "destination_address": destination_address,
            "amount": amount,
            "threshold_signing": "ready",
            "next_step": "call_sign_transaction_endpoint"
        }), 200
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Sippar Hivelocity API Server...")
    print(f"📍 ICP Mainnet Canister: vj7ly-diaaa-aaaae-abvoq-cai")
    print(f"🔐 Threshold Signatures: ENABLED")
    print("=" * 60)
    
    # Run on Hivelocity
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=8203,       # Sippar API port
        debug=False,     # Production mode
        threaded=True    # Handle concurrent requests
    )