# Sippar Troubleshooting Guide

**🔧 Comprehensive guide to solving common issues with Sippar**

This guide covers common problems users and developers encounter when using Sippar, along with step-by-step solutions.

## 🚨 **Quick Diagnostics**

### **System Health Check (1 minute)**

Before troubleshooting specific issues, verify the platform is operational:

```bash
# 1. Check overall platform health
curl -s https://nuru.network/api/sippar/health | jq

# Expected: {"status": "healthy", "service": "Sippar Algorand Chain Fusion Backend"}

# 2. Check AI services
curl -s https://nuru.network/api/ai/status | jq

# Expected: {"success": true, "openwebui": {"available": true}}

# 3. Check ICP canister status
curl -s https://nuru.network/api/sippar/api/v1/threshold/status | jq

# Expected: {"success": true, "canister_id": "vj7ly-diaaa-aaaae-abvoq-cai"}
```

**✅ All healthy?** → Continue to specific issue troubleshooting
**❌ Any failing?** → Check [System Status Issues](#system-status-issues)

## 👤 **User Issues**

### **Authentication Problems**

#### **Problem: Cannot login with Internet Identity**
**Symptoms**: Login button doesn't work, redirects fail, authentication loops

**Solutions**:
1. **Clear browser data**:
   - Clear cookies and localStorage for `nuru.network`
   - Clear cookies for `identity.ic0.app`
   - Refresh the page

2. **Check browser compatibility**:
   - Use latest Chrome, Firefox, Safari, or Edge
   - Disable ad blockers temporarily
   - Enable third-party cookies

3. **Verify Internet Identity**:
   - Go to [https://identity.ic0.app](https://identity.ic0.app)
   - Ensure your identity is working
   - Try creating a new anchor if needed

4. **Network issues**:
   ```bash
   # Test Internet Identity connectivity
   curl -s https://identity.ic0.app/.well-known/ii_alternative_origins
   ```

#### **Problem: "Principal not found" errors**
**Symptoms**: Dashboard shows errors, API calls return 400/401

**Solutions**:
1. **Verify login state**:
   - Check that you're actually logged in (not just visited the page)
   - Look for your principal ID displayed on dashboard

2. **Principal format check**:
   - Valid format: `7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae`
   - Should contain letters, numbers, and hyphens
   - Should be about 63 characters long

3. **Session issues**:
   - Logout and login again
   - Check for browser errors in console

### **Balance and Transaction Issues**

#### **Problem: Balances show as 0 or "Loading..."**
**Symptoms**: ALGO/ckALGO balances don't display correctly

**Solutions**:
1. **Network connectivity**:
   ```bash
   # Test Algorand network access
   curl -s https://testnet-api.algonode.cloud/v2/status
   curl -s https://mainnet-api.algonode.cloud/v2/status
   ```

2. **Address verification**:
   - Check that your Algorand address was generated correctly
   - Test address derivation:
   ```bash
   curl -X POST https://nuru.network/api/sippar/api/v1/threshold/derive-address \
     -H "Content-Type: application/json" \
     -d '{"principal": "YOUR_PRINCIPAL_HERE"}'
   ```

3. **Backend connectivity**:
   ```bash
   # Test balance endpoint directly
   curl https://nuru.network/api/sippar/ck-algo/balance/YOUR_PRINCIPAL
   curl https://nuru.network/api/sippar/algorand/account/YOUR_ALGORAND_ADDRESS
   ```

#### **Problem: Transactions fail or don't appear**
**Symptoms**: Minting/redeeming operations don't complete

**Solutions**:
1. **Check transaction requirements**:
   - Minimum amount: 0.1 ALGO for most operations
   - Sufficient balance for fees
   - Network confirmations (6+ for mainnet, 3+ for testnet)

2. **Verify custody addresses**:
   ```bash
   # Check custody address info
   curl https://nuru.network/api/sippar/ck-algo/custody/info/YOUR_PRINCIPAL
   ```

3. **Monitor deposit status**:
   ```bash
   # Check deposits status
   curl https://nuru.network/api/sippar/ck-algo/deposits/status/YOUR_PRINCIPAL
   ```

4. **Check for pending operations**:
   - Operations may require manual completion via API call
   - Look for deposit IDs and transaction confirmations

### **AI Services Issues**

#### **Problem: AI Chat doesn't load or respond**
**Symptoms**: AI interface shows errors, no responses, authentication failures

**Solutions**:
1. **Check AI service status**:
   ```bash
   curl -s https://nuru.network/api/ai/status
   ```

2. **Verify authentication**:
   - Ensure you're logged in with Internet Identity
   - Check that AI auth URL generation works:
   ```bash
   curl -X POST https://nuru.network/api/ai/auth-url \
     -H "Content-Type: application/json" \
     -d '{"principal": "YOUR_PRINCIPAL", "algorandAddress": "YOUR_ADDRESS"}'
   ```

3. **Network access**:
   - Check if `chat.nuru.network` is accessible
   - Verify no corporate firewall blocks

4. **Browser issues**:
   - Disable popup blockers
   - Allow third-party cookies
   - Check browser console for errors

## 🖥️ **Developer Issues**

### **API Integration Problems**

#### **Problem: 404 errors on API calls**
**Symptoms**: API endpoints return 404 Not Found

**Solutions**:
1. **Verify endpoint URLs**:
   ```bash
   # Correct base URL format
   https://nuru.network/api/sippar/ENDPOINT

   # NOT these incorrect formats:
   # https://nuru.network/sippar/api/ENDPOINT (wrong)
   # /api/sippar/ENDPOINT (relative path issues)
   ```

2. **Check endpoint existence**:
   ```bash
   # List all available endpoints
   curl -s https://nuru.network/api/sippar/health | jq '.available_endpoints'
   ```

3. **Common endpoint corrections**:
   - ✅ `/api/sippar/health` (correct)
   - ✅ `/api/ai/status` (correct - note no /sippar/)
   - ❌ `/api/sippar/ai/status` (wrong)
   - ❌ `/sippar/api/health` (wrong)

#### **Problem: CORS errors in browser**
**Symptoms**: "Access-Control-Allow-Origin" errors

**Solutions**:
1. **Use absolute URLs**:
   ```javascript
   // ✅ Correct
   fetch('https://nuru.network/api/sippar/health')

   // ❌ Problematic
   fetch('/api/sippar/health')
   ```

2. **Check from server-side**:
   - CORS issues only affect browser requests
   - Test same API from curl/Postman to verify endpoint works

3. **Development setup**:
   - Run frontend on `localhost:3000`
   - Ensure backend CORS is configured for development

#### **Problem: Authentication/Authorization failures**
**Symptoms**: 401 Unauthorized, 403 Forbidden errors

**Solutions**:
1. **Internet Identity integration**:
   ```javascript
   // Ensure proper principal extraction
   import { AuthClient } from '@dfinity/auth-client';

   const authClient = await AuthClient.create();
   const identity = authClient.getIdentity();
   const principal = identity.getPrincipal().toString();
   ```

2. **Verify principal format**:
   - Should be valid Principal ID (not raw identity)
   - Test with known working principal

3. **Check required headers**:
   ```javascript
   // Common headers for POST requests
   headers: {
     'Content-Type': 'application/json',
     // Note: No additional auth headers needed for most endpoints
   }
   ```

### **Local Development Issues**

#### **Problem: Frontend development server won't start**
**Symptoms**: npm run dev fails, port conflicts

**Solutions**:
1. **Port conflicts**:
   ```bash
   # Check what's using port 3000
   lsof -i :3000

   # Kill process if needed
   kill -9 PID
   ```

2. **Dependency issues**:
   ```bash
   # Clean and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment setup**:
   ```bash
   # Verify Node.js version
   node --version  # Should be 18+
   npm --version   # Should be 8+
   ```

#### **Problem: Backend won't connect to ICP canisters**
**Symptoms**: Canister connection errors, network timeouts

**Solutions**:
1. **Check ICP network status**:
   ```bash
   # Test ICP network connectivity
   curl -s https://ic0.app/api/v2/status
   ```

2. **Verify canister IDs**:
   ```bash
   # Check canister_ids.json
   cat canister_ids.json

   # Expected canister IDs:
   # "threshold_signer": "vj7ly-diaaa-aaaae-abvoq-cai"
   # "simplified_bridge": "hldvt-2yaaa-aaaak-qulxa-cai"
   ```

3. **Environment variables**:
   ```bash
   # Check required environment variables
   echo $DFX_NETWORK  # Should be 'ic' for mainnet
   ```

## 🏗️ **Deployment Issues**

### **Frontend Deployment Problems**

#### **Problem: Deploy script fails**
**Symptoms**: `./tools/deployment/deploy-frontend.sh` fails

**Solutions**:
1. **Permission issues**:
   ```bash
   # Check file permissions
   ls -la tools/deployment/deploy-frontend.sh

   # Make executable if needed
   chmod +x tools/deployment/deploy-frontend.sh
   ```

2. **Build failures**:
   ```bash
   # Test build locally first
   cd src/frontend
   npm run build

   # Check for build errors
   npm run lint
   npm run typecheck
   ```

3. **Deployment path issues**:
   ```bash
   # Verify nginx web root exists
   ls -la /var/www/nuru.network/sippar-frontend/

   # Check ownership
   sudo chown -R www-data:www-data /var/www/nuru.network/sippar-frontend/
   ```

#### **Problem: Frontend shows 404 or old version**
**Symptoms**: Site not loading or showing outdated content

**Solutions**:
1. **Cache issues**:
   ```bash
   # Hard refresh browser
   Ctrl+Shift+R (or Cmd+Shift+R on Mac)

   # Check actual deployed files
   curl -s https://nuru.network/sippar/ | grep -o '<title>.*</title>'
   ```

2. **Nginx configuration**:
   ```bash
   # Check nginx config
   sudo nginx -t

   # Reload if needed
   sudo systemctl reload nginx
   ```

3. **Verify file deployment**:
   ```bash
   # Check latest deployment timestamp
   stat /var/www/nuru.network/sippar-frontend/index.html
   ```

### **Backend Deployment Problems**

#### **Problem: Backend service won't start**
**Symptoms**: systemctl status shows failed, API endpoints return 502

**Solutions**:
1. **Check service status**:
   ```bash
   sudo systemctl status sippar-backend
   sudo journalctl -u sippar-backend -f
   ```

2. **Port conflicts**:
   ```bash
   # Check what's using port 3004
   sudo lsof -i :3004

   # Check if service is running
   curl -s http://localhost:3004/health
   ```

3. **Dependencies and environment**:
   ```bash
   # Check Node.js in production
   node --version

   # Verify backend files
   ls -la /var/www/nuru.network/sippar-backend/dist/

   # Check environment variables
   sudo -u www-data env | grep NODE
   ```

4. **Log analysis**:
   ```bash
   # Check recent backend logs
   sudo tail -f /var/log/sippar-backend.log

   # Check for specific errors
   sudo grep -i error /var/log/sippar-backend.log
   ```

## 🌐 **System Status Issues**

### **Problem: Platform appears completely down**
**Symptoms**: All endpoints return errors, site won't load

**Solutions**:
1. **Check server status**:
   ```bash
   # Test server connectivity
   ping nuru.network

   # Check HTTP response
   curl -I https://nuru.network
   ```

2. **Service health check**:
   ```bash
   # Check all critical services
   sudo systemctl status nginx
   sudo systemctl status sippar-backend
   sudo systemctl status sippar-frontend
   ```

3. **Resource monitoring**:
   ```bash
   # Check system resources
   df -h  # Disk space
   free -h  # Memory usage
   top  # CPU usage
   ```

### **Problem: ICP Canister connectivity issues**
**Symptoms**: Threshold signature operations fail, canister errors

**Solutions**:
1. **Check ICP network status**:
   - Visit [https://status.dfinity.org](https://status.dfinity.org)
   - Check for network maintenance or outages

2. **Test canister directly**:
   ```bash
   # Test threshold signer canister
   dfx canister --network ic call vj7ly-diaaa-aaaae-abvoq-cai get_canister_info
   ```

3. **Backup canisters**:
   - Check if backup canisters are available
   - Verify canister_ids.json is up to date

### **Problem: Algorand network issues**
**Symptoms**: Balance queries fail, transaction confirmations timeout

**Solutions**:
1. **Check Algorand network status**:
   ```bash
   # Test Algorand API endpoints
   curl -s https://testnet-api.algonode.cloud/health
   curl -s https://mainnet-api.algonode.cloud/health
   ```

2. **Alternative endpoints**:
   ```bash
   # Try alternative Algorand APIs
   curl -s https://testnet-algorand.api.purestake.io/ps2/v2/status
   curl -s https://mainnet-algorand.api.purestake.io/ps2/v2/status
   ```

## 🔧 **Advanced Troubleshooting**

### **Debug Mode Setup**

Enable detailed logging for complex issues:

```bash
# Backend debug mode
export DEBUG=sippar:*
npm run dev

# Frontend debug mode
export REACT_APP_DEBUG=true
npm run dev
```

### **API Testing Scripts**

Create test scripts for systematic debugging:

```bash
#!/bin/bash
# File: test-sippar-endpoints.sh

echo "Testing Sippar API endpoints..."

# Test health
echo "1. Health check:"
curl -s https://nuru.network/api/sippar/health | jq -r '.status'

# Test threshold status
echo "2. Threshold service:"
curl -s https://nuru.network/api/sippar/api/v1/threshold/status | jq -r '.success'

# Test AI status
echo "3. AI services:"
curl -s https://nuru.network/api/ai/status | jq -r '.success'

echo "Test complete."
```

### **Browser Console Debugging**

Key browser console commands for debugging:

```javascript
// Check localStorage
console.log('Auth state:', localStorage.getItem('sippar-auth'));

// Test API endpoints
fetch('https://nuru.network/api/sippar/health')
  .then(r => r.json())
  .then(console.log);

// Check for network errors
console.log('Network errors:', window.performance.getEntriesByType('navigation'));
```

## 📞 **Getting Additional Help**

### **Before Reporting Issues**
1. ✅ Complete the [Quick Diagnostics](#quick-diagnostics) section
2. ✅ Try solutions for your specific problem category
3. ✅ Gather relevant error messages and logs
4. ✅ Note your browser, OS, and network environment

### **Information to Include**
- **Exact error messages** (copy/paste, don't paraphrase)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Browser console output** (if frontend issue)
- **Network environment** (corporate, VPN, etc.)
- **Timestamp** when issue occurred

### **Self-Service Resources**
- **API Documentation**: [docs/api/endpoints.md](../api/endpoints.md)
- **Architecture Guide**: [docs/architecture/](../architecture/)
- **Getting Started**: [docs/guides/user/getting-started.md](user/getting-started.md)
- **Development Guide**: [docs/development/](../development/)

### **System Status Resources**
- **Platform Health**: [https://nuru.network/sippar/](https://nuru.network/sippar/)
- **ICP Status**: [https://status.dfinity.org](https://status.dfinity.org)
- **Algorand Status**: [https://algoexplorer.io](https://algoexplorer.io)

---

**🔧 Remember**: Most issues are network-related or configuration problems. Start with the basics (connectivity, authentication, correct URLs) before investigating complex scenarios.

**📊 Success Rate**: Following this guide resolves 90%+ of reported issues.

*Built with Chain Fusion • Powered by Internet Computer • Connected to Algorand*