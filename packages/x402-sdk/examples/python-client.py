#!/usr/bin/env python3
"""
Sippar X402 Python Client Example
A Python implementation demonstrating X402 payment protocol integration
"""

import json
import time
import base64
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class X402Config:
    """Configuration for X402 client"""
    principal: str
    algorand_address: str
    base_url: str = "https://nuru.network/api/sippar/x402"
    timeout: int = 30


@dataclass
class X402PaymentResponse:
    """Response from X402 payment creation"""
    success: bool
    transaction_id: str
    service_token: str
    expiry_time: int
    processing_time: str


class X402Client:
    """Python client for Sippar X402 payment protocol"""

    def __init__(self, config: X402Config):
        self.config = config
        self.session = requests.Session()
        self.session.timeout = config.timeout

    def create_payment(self, service: str, amount: float, metadata: Optional[Dict] = None) -> X402PaymentResponse:
        """
        Create a new X402 payment for a service

        Args:
            service: Service identifier (e.g., 'ai-oracle-enhanced')
            amount: Payment amount in USD
            metadata: Optional metadata dictionary

        Returns:
            X402PaymentResponse with payment details

        Raises:
            requests.RequestException: If payment creation fails
        """
        payload = {
            "service": service,
            "amount": amount,
            "principal": self.config.principal,
            "algorandAddress": self.config.algorand_address,
            "metadata": metadata or {}
        }

        response = self.session.post(
            f"{self.config.base_url}/create-payment",
            json=payload,
            headers={"Content-Type": "application/json"}
        )

        response.raise_for_status()
        data = response.json()

        if not data.get("success"):
            raise Exception(f"Payment creation failed: {data.get('error', 'Unknown error')}")

        payment = data["payment"]
        return X402PaymentResponse(
            success=True,
            transaction_id=payment["transactionId"],
            service_token=payment["serviceAccessToken"],
            expiry_time=payment["expiryTime"],
            processing_time=data.get("performance", {}).get("processingTime", "unknown")
        )

    def query_ai_service(self, query: str, model: str, service_token: str) -> Dict[str, Any]:
        """
        Query AI service using X402 payment token

        Args:
            query: AI query string
            model: AI model to use
            service_token: Service access token from payment

        Returns:
            AI service response
        """
        # In a real implementation, this would call the actual AI service
        # with the service token for authentication
        return {
            "query": query,
            "model": model,
            "response": f"AI response for: {query}",
            "token_used": service_token[:20] + "...",
            "status": "success"
        }

    def verify_token(self, token: str) -> bool:
        """
        Verify if a service token is valid

        Args:
            token: Service access token to verify

        Returns:
            True if token is valid, False otherwise
        """
        try:
            response = self.session.post(
                f"{self.config.base_url}/verify-token",
                json={"token": token}
            )
            return response.status_code == 200 and response.json().get("valid", False)
        except:
            return False

    def get_marketplace(self) -> Dict[str, Any]:
        """
        Get available services from the X402 marketplace

        Returns:
            Marketplace data with available services
        """
        response = self.session.get(f"{self.config.base_url}/agent-marketplace")
        response.raise_for_status()
        return response.json()


def main():
    """Example usage of the X402 Python client"""
    print("🐍 Sippar X402 Python Client Example")
    print("=" * 50)

    # Initialize client
    config = X402Config(
        principal="rdmx6-jaaaa-aaaah-qcaiq-cai",
        algorand_address="6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI"
    )
    client = X402Client(config)

    try:
        # 1. Get marketplace information
        print("📊 Fetching marketplace...")
        marketplace = client.get_marketplace()
        print(f"Available services: {marketplace['marketplace']['totalServices']}")

        # 2. Create payment for AI service
        print("\n💳 Creating payment for AI service...")
        payment = client.create_payment(
            service="ai-oracle-enhanced",
            amount=0.05,
            metadata={"client": "python", "version": "1.0"}
        )
        print(f"✅ Payment created: {payment.transaction_id}")
        print(f"⚡ Processing time: {payment.processing_time}")

        # 3. Use the service token
        print("\n🤖 Querying AI service...")
        ai_response = client.query_ai_service(
            query="What are the benefits of blockchain technology?",
            model="deepseek-r1",
            service_token=payment.service_token
        )
        print(f"🔮 AI Response: {ai_response['response']}")

        # 4. Verify token
        print("\n🔐 Verifying token...")
        is_valid = client.verify_token(payment.service_token)
        print(f"Token valid: {is_valid}")

        print("\n🎉 Python X402 integration successful!")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()