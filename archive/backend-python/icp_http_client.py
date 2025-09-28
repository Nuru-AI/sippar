"""
Sippar ICP Mainnet HTTP Client
Simple HTTP-based client for calling ICP canister functions
"""

import requests
import json
import cbor2
import hashlib
from typing import Dict, Optional

class SipparMainnetHTTPClient:
    """HTTP-based client for ICP canister calls"""
    
    def __init__(self):
        self.canister_id = "vj7ly-diaaa-aaaae-abvoq-cai"
        self.ic_url = "https://ic0.app/api/v2/canister/{}/call"
        
    def encode_principal(self, principal_str: str) -> bytes:
        """Encode principal string to bytes for CBOR"""
        # Simple principal encoding - in production you'd use proper principal library
        return principal_str.encode('utf-8')
        
    def make_canister_call(self, method_name: str, args: list) -> Dict:
        """Make HTTP call to ICP canister"""
        try:
            url = self.ic_url.format(self.canister_id)
            
            # Create the call data
            call_data = {
                "request_type": "call",
                "canister_id": self.canister_id,
                "method_name": method_name,
                "arg": cbor2.dumps(args),
                "sender": "2vxsx-fae"  # Anonymous principal
            }
            
            headers = {
                'Content-Type': 'application/cbor',
            }
            
            # For now, return a mock response since direct HTTP calls to IC require proper authentication
            # In production, you'd need to implement proper IC authentication
            return self._mock_canister_response(method_name, args)
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Canister call failed: {str(e)}",
                "error_code": 500
            }
    
    def _mock_canister_response(self, method_name: str, args: list) -> Dict:
        """Mock responses for testing - replace with actual IC calls in production"""
        if method_name == "derive_algorand_address":
            return {
                "success": True,
                "address": "YVBUY2NB6ZCSVY3YNSWEWYTQZEPOZCUXPZQAGWOHC4IQCVZBM7C5WGR7RE",
                "public_key": "03c5434c69a1f6452ae3786cac4b6270c91eec8a977e600359c7171101570167c5",
                "canister_id": self.canister_id,
                "note": "Using mock response - integrate with proper IC agent for production"
            }
        elif method_name == "sign_algorand_transaction":
            return {
                "success": True,
                "signature": "bd72a26c7a66947a6345aca2411cc5d0e0340eff8e3693bf0b2fea4a4518dbaa062b5bc351a71094dfd04e0a1da44b11981fd898d2203fb945c828ffdddc07ef",
                "transaction_bytes": args[1].hex() if len(args) > 1 else "0102030405",
                "signed_tx_id": "3ca63b4bf16e296c2963d1647675f12cc77f7cc3a72a094201187cfb74304ae6",
                "canister_id": self.canister_id,
                "note": "Using mock response - integrate with proper IC agent for production"
            }
        else:
            return {
                "success": False,
                "error": f"Unknown method: {method_name}",
                "error_code": 404
            }
    
    async def derive_algorand_address(self, user_principal: str) -> Dict:
        """Derive Algorand address via ICP canister"""
        try:
            return self.make_canister_call("derive_algorand_address", [user_principal])
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": 500
            }
    
    async def sign_algorand_transaction(self, user_principal: str, transaction_bytes: bytes) -> Dict:
        """Sign transaction via ICP canister"""
        try:
            return self.make_canister_call("sign_algorand_transaction", [user_principal, list(transaction_bytes)])
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": 500
            }