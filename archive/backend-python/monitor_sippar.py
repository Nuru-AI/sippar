#!/usr/bin/env python3
"""
Sippar API Monitoring Script
Monitors the health and performance of the Sippar API on Hivelocity
"""

import requests
import time
import json
import logging
import sys
from datetime import datetime
from typing import Dict, Any
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/sippar_monitor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class SipparMonitor:
    def __init__(self):
        self.api_base = "http://localhost:8203"
        self.health_endpoint = f"{self.api_base}/health"
        self.status_endpoint = f"{self.api_base}/api/v1/threshold/status"
        self.derive_endpoint = f"{self.api_base}/api/v1/threshold/derive-address"
        
    def check_health(self) -> Dict[str, Any]:
        """Check API health endpoint"""
        try:
            start_time = time.time()
            response = requests.get(self.health_endpoint, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "healthy",
                    "response_time": round(response_time * 1000, 2),  # ms
                    "data": data
                }
            else:
                return {
                    "status": "unhealthy",
                    "status_code": response.status_code,
                    "response_time": round(response_time * 1000, 2)
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "status": "error",
                "error": str(e),
                "response_time": None
            }
    
    def check_system_status(self) -> Dict[str, Any]:
        """Check system status endpoint"""
        try:
            start_time = time.time()
            response = requests.get(self.status_endpoint, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "operational",
                    "response_time": round(response_time * 1000, 2),
                    "canister_id": data.get("canister_id", "unknown"),
                    "network": data.get("network", "unknown"),
                    "integration_status": data.get("integration_status", "unknown")
                }
            else:
                return {
                    "status": "error",
                    "status_code": response.status_code,
                    "response_time": round(response_time * 1000, 2)
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "status": "error",
                "error": str(e),
                "response_time": None
            }
    
    def test_address_derivation(self) -> Dict[str, Any]:
        """Test address derivation functionality"""
        try:
            start_time = time.time()
            test_payload = {"principal": "rdmx6-jaaaa-aaaaa-aaadq-cai"}
            
            response = requests.post(
                self.derive_endpoint,
                json=test_payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return {
                        "status": "working",
                        "response_time": round(response_time * 1000, 2),
                        "address_length": len(data.get("address", "")),
                        "has_public_key": bool(data.get("public_key")),
                        "canister_id": data.get("canister_id", "unknown")
                    }
                else:
                    return {
                        "status": "failed",
                        "response_time": round(response_time * 1000, 2),
                        "error": data.get("error", "Unknown error")
                    }
            else:
                return {
                    "status": "error",
                    "status_code": response.status_code,
                    "response_time": round(response_time * 1000, 2)
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "status": "error",
                "error": str(e),
                "response_time": None
            }
    
    def run_monitoring_check(self) -> Dict[str, Any]:
        """Run complete monitoring check"""
        timestamp = datetime.utcnow().isoformat()
        
        logger.info("Starting Sippar API monitoring check...")
        
        # Run all checks
        health_check = self.check_health()
        status_check = self.check_system_status()
        derive_check = self.test_address_derivation()
        
        # Compile results
        results = {
            "timestamp": timestamp,
            "health": health_check,
            "system_status": status_check,
            "address_derivation": derive_check,
            "overall_status": "healthy" if all([
                health_check.get("status") == "healthy",
                status_check.get("status") == "operational",
                derive_check.get("status") == "working"
            ]) else "degraded"
        }
        
        # Log results
        if results["overall_status"] == "healthy":
            logger.info("✅ All checks passed - Sippar API is healthy")
            logger.info(f"Health response time: {health_check.get('response_time', 'N/A')}ms")
            logger.info(f"Address derivation time: {derive_check.get('response_time', 'N/A')}ms")
        else:
            logger.warning("⚠️ Some checks failed - Sippar API may have issues")
            if health_check.get("status") != "healthy":
                logger.error(f"Health check failed: {health_check}")
            if status_check.get("status") != "operational":
                logger.error(f"Status check failed: {status_check}")
            if derive_check.get("status") != "working":
                logger.error(f"Address derivation failed: {derive_check}")
        
        return results
    
    def run_continuous_monitoring(self, interval: int = 60):
        """Run continuous monitoring with specified interval"""
        logger.info(f"Starting continuous monitoring (interval: {interval}s)")
        
        while True:
            try:
                results = self.run_monitoring_check()
                
                # Save results to file for external monitoring
                with open('/tmp/sippar_monitor_status.json', 'w') as f:
                    json.dump(results, f, indent=2)
                
                # Sleep until next check
                time.sleep(interval)
                
            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                time.sleep(interval)

def main():
    monitor = SipparMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--continuous":
        # Run continuous monitoring
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        monitor.run_continuous_monitoring(interval)
    else:
        # Run single check
        results = monitor.run_monitoring_check()
        print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()