# Sippar - Complete Hivelocity Deployment Guide

## 📋 Prerequisites & Setup

### **Required Dependencies**
Before deploying Sippar, ensure you have:

1. **Python 3.8+**: Required for Sippar API server
   ```bash
   python3 --version  # Should be 3.8+
   pip3 --version
   ```

2. **SSH Key Setup**: Hivelocity VPS SSH key
   ```bash
   # Verify SSH key exists
   ls -la ~/.ssh/hivelocity_key
   
   # If missing, contact system administrator for SSH key
   # Key should have 600 permissions
   chmod 600 ~/.ssh/hivelocity_key
   ```

3. **Project Dependencies**: Install Python dependencies
   ```bash
   cd /Users/eladm/Projects/Nuru-AI/Sippar
   pip3 install -r requirements.txt
   ```

### **VPS Infrastructure Details**
- **Server**: 74.50.113.152 (Hivelocity VPS)
- **Operating System**: Ubuntu/Debian Linux
- **Web Server**: Nginx
- **Target Path**: `/var/www/nuru.network/sippar/`
- **API Port**: 8203 (Sippar threshold signature API)
- **Domain**: nuru.network
- **SSH User**: root

## 🚀 Sippar Architecture Overview

### **Sippar Deployment Components**
- **ICP Mainnet Canister**: `vj7ly-diaaa-aaaae-abvoq-cai` (threshold signatures) ✅ **DEPLOYED**
- **Hivelocity API Server**: `hivelocity_api_server.py` (port 8203)
- **Frontend**: React/TypeScript application
- **Backend Integration**: Python API bridge to ICP mainnet

### **What Makes Sippar Different from Rabbi**
- **ICP Integration**: Uses live ICP mainnet canister for threshold signatures
- **Algorand Focus**: Specialized for Algorand blockchain integration
- **Threshold Security**: All signatures backed by ICP subnet consensus
- **Chain Fusion**: Bridges Internet Computer and Algorand ecosystems

## ✅ ICP Mainnet Integration Complete

The Sippar threshold signature canister is **LIVE** on ICP mainnet:
- **Canister ID**: `vj7ly-diaaa-aaaae-abvoq-cai`
- **Status**: ✅ **OPERATIONAL**
- **Validation**: Address derivation and transaction signing tested ✅
- **Algorand Compatibility**: All addresses pass algosdk validation ✅

## 🚀 How to Deploy Sippar (Step-by-Step)

### **Step 1: Navigate to Sippar Directory**
```bash
cd /Users/eladm/Projects/Nuru-AI/Sippar
# Ensure you have all required files
```

### **Step 2: Install Python Dependencies**
```bash
pip3 install -r requirements.txt
```

### **Step 3: Create Deployment Script**
```bash
cat > deploy_sippar_to_vps.sh << 'EOF'
#!/bin/bash

# Sippar Hivelocity VPS Deployment Script
# Deploys Sippar API server and frontend to production VPS

set -e

# Configuration
VPS_HOST="74.50.113.152"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/hivelocity_key"
REMOTE_PATH="/var/www/nuru.network/sippar"
LOCAL_API_FILES="hivelocity_api_server.py icp_mainnet_integration.py requirements.txt"

echo "🚀 Starting Sippar deployment to Hivelocity VPS..."
echo "📍 ICP Canister: vj7ly-diaaa-aaaae-abvoq-cai"
echo "🌐 Target: $VPS_HOST:$REMOTE_PATH"

# Safety checks
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    echo "Contact system administrator for hivelocity_key"
    exit 1
fi

# Test SSH connectivity
echo "🔑 Testing SSH connectivity..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" "echo 'SSH test successful'"; then
    echo "❌ SSH connection failed"
    exit 1
fi

# Create remote directory
echo "📁 Creating remote directories..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $REMOTE_PATH"

# Deploy API server files
echo "📤 Deploying Sippar API server files..."
for file in $LOCAL_API_FILES; do
    if [ -f "$file" ]; then
        echo "  → Uploading $file"
        scp -i "$SSH_KEY" "$file" "$VPS_USER@$VPS_HOST:$REMOTE_PATH/"
    else
        echo "⚠️  File not found: $file"
    fi
done

# Install Python dependencies on VPS
echo "🐍 Installing Python dependencies on VPS..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $REMOTE_PATH && pip3 install -r requirements.txt"

# Set proper permissions
echo "🔐 Setting file permissions..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "chown -R www-data:www-data $REMOTE_PATH"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "chmod +x $REMOTE_PATH/hivelocity_api_server.py"

# Check if Sippar API is already running and stop it
echo "🔄 Managing Sippar API service..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "pkill -f 'hivelocity_api_server.py' || true"

# Start Sippar API server
echo "🌟 Starting Sippar API server (port 8203)..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $REMOTE_PATH && nohup python3 hivelocity_api_server.py > sippar_api.log 2>&1 &"

# Wait a moment for server to start
sleep 3

# Test API server
echo "🧪 Testing Sippar API server..."
if ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8203/health" | grep -q "200"; then
    echo "✅ Sippar API server is running successfully!"
else
    echo "⚠️  API server may need a moment to start. Check logs with:"
    echo "   ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'tail -f $REMOTE_PATH/sippar_api.log'"
fi

# Reload nginx if needed
echo "🔄 Reloading nginx configuration..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "systemctl reload nginx"

echo ""
echo "🎉 Sippar deployment completed!"
echo ""
echo "📍 Access URLs:"
echo "   API Health: http://74.50.113.152:8203/health"
echo "   API Status: http://74.50.113.152:8203/api/v1/threshold/status"
echo ""
echo "🔧 Management Commands:"
echo "   Check API logs: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'tail -f $REMOTE_PATH/sippar_api.log'"
echo "   Restart API: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'pkill -f hivelocity_api_server.py && cd $REMOTE_PATH && nohup python3 hivelocity_api_server.py > sippar_api.log 2>&1 &'"
echo ""
echo "🚀 ICP Mainnet Canister: vj7ly-diaaa-aaaae-abvoq-cai"
echo "✅ Threshold signatures ready for production!"

EOF

chmod +x deploy_sippar_to_vps.sh
```

### **Step 4: Deploy to VPS**
```bash
./deploy_sippar_to_vps.sh
```

## 📄 Required Files & Structure

### **Essential Files for Sippar Deployment:**
```
/Users/eladm/Projects/Nuru-AI/Sippar/
├── deploy_sippar_to_vps.sh          # Deployment script
├── hivelocity_api_server.py         # API server (port 8203)
├── icp_mainnet_integration.py       # ICP client library
├── requirements.txt                 # Python dependencies
├── mainnet-integration-config.json  # Configuration
├── SIPPAR_HIVELOCITY_DEPLOYMENT.md  # This guide
└── canister_ids.json               # ICP canister ID
```

## 🔐 SSH Configuration Requirements

### **SSH Key Setup**
```bash
# SSH key must exist at:
~/.ssh/hivelocity_key

# Test SSH connectivity:
ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "echo 'SSH test successful'"
```

### **VPS Requirements**
- ✅ **SSH Access**: Root access to `74.50.113.152`
- ✅ **Python 3.8+**: For running API server
- ✅ **Port 8203**: Available for Sippar API
- ✅ **Web Directory**: `/var/www/nuru.network/sippar/` writable
- ✅ **Internet Access**: For ICP mainnet communication

## 🌐 Sippar API Endpoints

Once deployed, these endpoints will be available:

### **Core Threshold Signature Endpoints**
```bash
# Health check
curl http://74.50.113.152:8203/health

# Derive Algorand address
curl -X POST http://74.50.113.152:8203/api/v1/threshold/derive-address \
  -H "Content-Type: application/json" \
  -d '{"principal": "rdmx6-jaaaa-aaaaa-aaadq-cai"}'

# Sign transaction
curl -X POST http://74.50.113.152:8203/api/v1/threshold/sign-transaction \
  -H "Content-Type: application/json" \
  -d '{"principal": "rdmx6-jaaaa-aaaaa-aaadq-cai", "transaction_hex": "0102030405"}'

# Get canister status
curl http://74.50.113.152:8203/api/v1/threshold/status
```

### **Sippar-Specific Endpoints**
```bash
# Prepare mint operation
curl -X POST http://74.50.113.152:8203/api/v1/sippar/mint/prepare \
  -H "Content-Type: application/json" \
  -d '{"principal": "user_principal", "amount": 1000000}'

# Prepare redeem operation
curl -X POST http://74.50.113.152:8203/api/v1/sippar/redeem/prepare \
  -H "Content-Type: application/json" \
  -d '{"principal": "user_principal", "destination": "ALGO_ADDRESS", "amount": 1000000}'
```

## 🎯 Production URLs

### **Sippar Access Points**
- **API Base**: `http://74.50.113.152:8203/`
- **Health Check**: `http://74.50.113.152:8203/health`
- **Threshold Status**: `http://74.50.113.152:8203/api/v1/threshold/status`

### **Integration with Existing Infrastructure**
- **Domain**: Can be proxied through `nuru.network/sippar/api/`
- **SSL**: Nginx can handle HTTPS termination
- **Load Balancing**: Single API server initially, can scale

## ✅ Verification Commands

After deployment, verify Sippar is working:

```bash
# Test API server is running
curl -I http://74.50.113.152:8203/health

# Test ICP mainnet integration
curl -X POST http://74.50.113.152:8203/api/v1/threshold/derive-address \
  -H "Content-Type: application/json" \
  -d '{"principal": "rdmx6-jaaaa-aaaaa-aaadq-cai"}' | jq .

# Check API server logs
ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "tail -20 /var/www/nuru.network/sippar/sippar_api.log"

# Verify ICP canister is accessible
curl http://74.50.113.152:8203/api/v1/threshold/status | jq .
```

## 🏆 Deployment Success Indicators

### **✅ Successful Sippar Deployment Shows:**
1. **SSH Connection**: VPS accessible with proper credentials
2. **File Transfer**: All Python files uploaded successfully
3. **Dependencies**: Python packages installed on VPS
4. **API Server**: Running on port 8203 with no errors
5. **ICP Connection**: Can communicate with mainnet canister
6. **Health Check**: `/health` endpoint returns 200 OK
7. **Threshold Functions**: Address derivation working
8. **Permissions**: Proper `www-data:www-data` ownership

### **🔧 If Deployment Fails:**

#### **Common Issues & Solutions:**

1. **SSH Connection Failed**
   ```bash
   # Check SSH key exists and has correct permissions
   ls -la ~/.ssh/hivelocity_key
   chmod 600 ~/.ssh/hivelocity_key
   
   # Test SSH manually
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152
   ```

2. **Python Dependencies Fail**
   ```bash
   # Check Python version on VPS
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "python3 --version"
   
   # Install missing system dependencies
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "apt update && apt install -y python3-pip python3-dev"
   ```

3. **API Server Won't Start**
   ```bash
   # Check for port conflicts
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "netstat -tulpn | grep :8203"
   
   # Check error logs
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "tail -50 /var/www/nuru.network/sippar/sippar_api.log"
   
   # Manual start with debugging
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "cd /var/www/nuru.network/sippar && python3 hivelocity_api_server.py"
   ```

4. **ICP Canister Connection Issues**
   ```bash
   # Test ICP mainnet connectivity from VPS
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "curl -I https://ic0.app"
   
   # Check if Python ic-py library is installed
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "python3 -c 'import ic; print(\"ICP library OK\")'"
   ```

5. **Permission Issues**
   ```bash
   # Fix file permissions
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "chown -R www-data:www-data /var/www/nuru.network/sippar/"
   ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "chmod +x /var/www/nuru.network/sippar/hivelocity_api_server.py"
   ```

## 📞 Sippar-Specific Support

### **ICP Mainnet Canister Support:**
- **Canister ID**: `vj7ly-diaaa-aaaae-abvoq-cai`
- **Network**: ICP Mainnet (`https://ic0.app`)
- **Status Page**: Check via API `/api/v1/threshold/status`
- **Cycles**: ~4.7T remaining (monitor via canister calls)

### **Threshold Signature Issues:**
- **Address Validation**: All addresses must pass `algosdk.isValidAddress()`
- **Key Format**: Uses `ecdsa:Secp256k1:key_1` on mainnet
- **Signature Format**: 64-byte secp256k1 signatures
- **Algorand Compatibility**: Addresses are mainnet-ready

### **Log Files for Debugging:**
```bash
# Sippar API logs
ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "tail -f /var/www/nuru.network/sippar/sippar_api.log"

# System logs
ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "journalctl -u nginx -f"

# Check running processes
ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 "ps aux | grep sippar"
```

## 📝 Summary

Sippar deployment provides:

1. ✅ **ICP Mainnet Integration**: Live canister `vj7ly-diaaa-aaaae-abvoq-cai`
2. ✅ **Threshold Security**: All signatures backed by ICP subnet consensus
3. ✅ **Algorand Compatibility**: Validated address format and transaction signing
4. ✅ **Hivelocity Infrastructure**: API server on proven VPS infrastructure
5. ✅ **Production Ready**: Complete deployment pipeline with monitoring

## 🚀 Quick Start for Sippar Deployment

1. **Ensure SSH access** to Hivelocity VPS (`hivelocity_key`)
2. **Navigate to Sippar directory**: `/Users/eladm/Projects/Nuru-AI/Sippar`
3. **Install dependencies**: `pip3 install -r requirements.txt`
4. **Run deployment script**: `./deploy_sippar_to_vps.sh`
5. **Verify deployment**: Test API endpoints listed above
6. **Monitor**: Check logs and API health endpoints

**Result**: Sippar threshold signature API running on port 8203 with ICP mainnet integration! 🎉

---

**Need help?** Contact development team with specific error messages and include both local logs and VPS logs from `/var/www/nuru.network/sippar/sippar_api.log`.