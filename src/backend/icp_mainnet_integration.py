"""
Sippar ICP Mainnet Integration
Connects Hivelocity backend to threshold signature canister on ICP mainnet
"""

import asyncio
import json
from typing import Dict, Optional
from ic import Agent, Principal, Identity
from ic.candid import Types

class SipparMainnetClient:
    """Client for interacting with Sippar threshold signature canister on ICP mainnet"""
    
    def __init__(self):
        self.canister_id = "vj7ly-diaaa-aaaae-abvoq-cai"
        self.network = "https://ic0.app"
        self.agent = Agent(url=self.network)
    
    async def derive_algorand_address(self, user_principal: str) -> Dict:
        """
        Derive a unique Algorand address for a user using threshold signatures
        
        Args:
            user_principal: User's principal ID
            
        Returns:
            Dict with 'address' and 'public_key' fields
        """
        try:
            # Convert string principal to Principal object
            principal = Principal.from_str(user_principal)
            
            # Call the canister
            result = await self.agent.call(
                Principal.from_str(self.canister_id),
                "derive_algorand_address",
                [principal]
            )
            
            if "Ok" in result:
                return {
                    "success": True,
                    "address": result["Ok"]["address"],
                    "public_key": result["Ok"]["public_key"].hex(),
                    "canister_id": self.canister_id
                }
            else:
                return {
                    "success": False,
                    "error": result["Err"]["message"],
                    "error_code": result["Err"]["code"]
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": 500
            }
    
    async def sign_algorand_transaction(self, user_principal: str, transaction_bytes: bytes) -> Dict:
        """
        Sign an Algorand transaction using threshold signatures
        
        Args:
            user_principal: User's principal ID
            transaction_bytes: Raw transaction bytes to sign
            
        Returns:
            Dict with signature and transaction details
        """
        try:
            # Convert string principal to Principal object
            principal = Principal.from_str(user_principal)
            
            # Convert bytes to list for candid
            tx_bytes_list = list(transaction_bytes)
            
            # Call the canister
            result = await self.agent.call(
                Principal.from_str(self.canister_id),
                "sign_algorand_transaction",
                [principal, tx_bytes_list]
            )
            
            if "Ok" in result:
                return {
                    "success": True,
                    "signature": bytes(result["Ok"]["signature"]).hex(),
                    "transaction_bytes": bytes(result["Ok"]["transaction_bytes"]).hex(),
                    "signed_tx_id": result["Ok"]["signed_tx_id"],
                    "canister_id": self.canister_id
                }
            else:
                return {
                    "success": False,
                    "error": result["Err"]["message"],
                    "error_code": result["Err"]["code"]
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": 500
            }

# Example usage for Hivelocity backend integration
async def main():
    """Example integration with Hivelocity backend"""
    
    client = SipparMainnetClient()
    
    # Example: Derive address for a user
    user_principal = "rdmx6-jaaaa-aaaaa-aaadq-cai"  # Example principal
    
    print("🔐 Deriving Algorand address via ICP mainnet threshold signatures...")
    address_result = await client.derive_algorand_address(user_principal)
    
    if address_result["success"]:
        print(f"✅ Address derived: {address_result['address']}")
        print(f"📁 Public key: {address_result['public_key']}")
        
        # Example: Sign a transaction
        print("\n✍️ Signing transaction via ICP mainnet threshold signatures...")
        test_tx = b"test_transaction_bytes"
        sign_result = await client.sign_algorand_transaction(user_principal, test_tx)
        
        if sign_result["success"]:
            print(f"✅ Transaction signed successfully!")
            print(f"📝 Signature: {sign_result['signature'][:32]}...")
            print(f"🆔 TX ID: {sign_result['signed_tx_id']}")
        else:
            print(f"❌ Signing failed: {sign_result['error']}")
    else:
        print(f"❌ Address derivation failed: {address_result['error']}")

if __name__ == "__main__":
    # For Hivelocity backend integration
    print("🚀 Sippar ICP Mainnet Integration Ready!")
    print(f"📍 Canister ID: vj7ly-diaaa-aaaae-abvoq-cai")
    print(f"🌐 Network: ICP Mainnet")
    print("=" * 60)
    
    # Run example (uncomment for testing)
    # asyncio.run(main())