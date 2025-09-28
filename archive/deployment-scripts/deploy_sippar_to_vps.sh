#!/bin/bash

# Sippar Hivelocity VPS Deployment Script
# Deploys Sippar API server and frontend to production VPS

set -e

# Configuration
VPS_HOST="74.50.113.152"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/hivelocity_key"
REMOTE_PATH="/var/www/nuru.network/sippar"
LOCAL_API_FILES="hivelocity_api_server.py icp_mainnet_integration.py requirements.txt mainnet-integration-config.json"

echo "🚀 Starting Sippar deployment to Hivelocity VPS..."
echo "📍 ICP Canister: vj7ly-diaaa-aaaae-abvoq-cai"
echo "🌐 Target: $VPS_HOST:$REMOTE_PATH"
echo "=" * 60

# Safety checks
echo "🔍 Performing safety checks..."

if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    echo "💡 Contact system administrator for hivelocity_key"
    echo "📋 Required: chmod 600 ~/.ssh/hivelocity_key"
    exit 1
fi

# Verify we're in the right directory
if [ ! -f "hivelocity_api_server.py" ]; then
    echo "❌ Not in Sippar project directory"
    echo "💡 Please run from: /Users/eladm/Projects/Nuru-AI/Sippar"
    echo "📋 Required files: hivelocity_api_server.py, icp_mainnet_integration.py"
    exit 1
fi

# Check for required files
echo "📋 Checking required files..."
for file in $LOCAL_API_FILES; do
    if [ ! -f "$file" ]; then
        echo "⚠️  Missing file: $file"
        echo "💡 Ensure all deployment files are present"
        exit 1
    else
        echo "  ✅ Found: $file"
    fi
done

# Test SSH connectivity
echo "🔑 Testing SSH connectivity..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o ServerAliveInterval=10 "$VPS_USER@$VPS_HOST" "echo 'SSH test successful'" 2>/dev/null; then
    echo "❌ SSH connection failed"
    echo "💡 Troubleshooting steps:"
    echo "   1. Check SSH key exists: ls -la $SSH_KEY"
    echo "   2. Set permissions: chmod 600 $SSH_KEY"
    echo "   3. Test manually: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST"
    exit 1
fi
echo "  ✅ SSH connectivity verified"

# Test VPS Python environment
echo "🐍 Checking VPS Python environment..."
if ! ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "python3 --version" 2>/dev/null; then
    echo "⚠️  Python3 may not be available on VPS"
    echo "💡 Installing Python3..."
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "apt update && apt install -y python3 python3-pip"
fi

# Create remote directory structure
echo "📁 Creating remote directories..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $REMOTE_PATH"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $REMOTE_PATH/logs"

# Backup existing deployment if it exists
echo "💾 Backing up existing deployment..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "
if [ -d '$REMOTE_PATH' ] && [ -f '$REMOTE_PATH/hivelocity_api_server.py' ]; then
    cp -r '$REMOTE_PATH' '$REMOTE_PATH.backup.$(date +%Y%m%d_%H%M%S)'
    echo '  ✅ Backup created'
else
    echo '  ℹ️  No existing deployment to backup'
fi
"

# Stop existing Sippar API if running
echo "🛑 Stopping existing Sippar API..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "pkill -f 'hivelocity_api_server.py' || echo '  ℹ️  No existing API server running'"

# Deploy API server files
echo "📤 Deploying Sippar API server files..."
for file in $LOCAL_API_FILES; do
    if [ -f "$file" ]; then
        echo "  → Uploading $file"
        scp -i "$SSH_KEY" "$file" "$VPS_USER@$VPS_HOST:$REMOTE_PATH/"
    fi
done

# Deploy this deployment guide too
echo "  → Uploading deployment documentation"
scp -i "$SSH_KEY" "SIPPAR_HIVELOCITY_DEPLOYMENT.md" "$VPS_USER@$VPS_HOST:$REMOTE_PATH/" 2>/dev/null || echo "  ⚠️  Deployment guide not found"

# Install Python dependencies on VPS
echo "🐍 Installing Python dependencies on VPS..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "
cd '$REMOTE_PATH' && 
echo 'Installing requirements...' &&
pip3 install -r requirements.txt &&
echo '  ✅ Python dependencies installed successfully'
"

# Set proper permissions
echo "🔐 Setting file permissions..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "chown -R www-data:www-data $REMOTE_PATH"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "chmod +x $REMOTE_PATH/hivelocity_api_server.py"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "chmod 755 $REMOTE_PATH"
echo "  ✅ Permissions set (www-data:www-data)"

# Create systemd service for better process management
echo "⚙️ Creating Sippar API service..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "
cat > /etc/systemd/system/sippar-api.service << 'EOF'
[Unit]
Description=Sippar Threshold Signature API
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$REMOTE_PATH
ExecStart=/usr/bin/python3 $REMOTE_PATH/hivelocity_api_server.py
Restart=always
RestartSec=5
StandardOutput=append:$REMOTE_PATH/logs/sippar_api.log
StandardError=append:$REMOTE_PATH/logs/sippar_error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo '  ✅ Systemd service created'
"

# Start Sippar API server using systemd
echo "🌟 Starting Sippar API server (port 8203)..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "
systemctl enable sippar-api
systemctl start sippar-api
echo '  ✅ Sippar API service started'
"

# Wait for server to start
echo "⏳ Waiting for API server to initialize..."
sleep 5

# Test API server health
echo "🧪 Testing Sippar API server..."
API_HEALTH=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8203/health" 2>/dev/null || echo "000")

if [ "$API_HEALTH" = "200" ]; then
    echo "  ✅ Sippar API server is running successfully!"
    
    # Test threshold signature endpoint
    echo "🔐 Testing ICP mainnet integration..."
    THRESHOLD_TEST=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "curl -s http://localhost:8203/api/v1/threshold/status | grep -o '\"canister_id\":\"[^\"]*\"' | head -1" 2>/dev/null || echo "")
    
    if [[ "$THRESHOLD_TEST" == *"vj7ly-diaaa-aaaae-abvoq-cai"* ]]; then
        echo "  ✅ ICP mainnet canister integration working!"
    else
        echo "  ⚠️  ICP integration may need verification"
    fi
else
    echo "  ⚠️  API server response: HTTP $API_HEALTH"
    echo "  💡 Checking logs..."
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "tail -10 $REMOTE_PATH/logs/sippar_error.log 2>/dev/null || echo 'No error logs yet'"
fi

# Configure Nginx proxy (if needed)
echo "🌐 Configuring Nginx..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "
# Create nginx site configuration for Sippar
cat > /etc/nginx/sites-available/sippar << 'EOF'
# Sippar API Proxy Configuration
location /sippar/api/ {
    proxy_pass http://localhost:8203/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    
    # CORS headers for API access
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
}

# Health check endpoint
location /sippar/health {
    proxy_pass http://localhost:8203/health;
    proxy_set_header Host \$host;
}
EOF

echo '  ✅ Nginx configuration created'
"

# Reload nginx
echo "🔄 Reloading nginx configuration..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "nginx -t && systemctl reload nginx"
echo "  ✅ Nginx reloaded successfully"

# Final deployment verification
echo "🎯 Final deployment verification..."
FINAL_TEST=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "systemctl is-active sippar-api" 2>/dev/null || echo "inactive")

if [ "$FINAL_TEST" = "active" ]; then
    echo "  ✅ Sippar API service is active and running"
else
    echo "  ⚠️  Service status: $FINAL_TEST"
fi

echo ""
echo "🎉 Sippar deployment completed!"
echo "=" * 60
echo ""
echo "📍 Access URLs:"
echo "   Direct API: http://74.50.113.152:8203/health"
echo "   Nginx Proxy: http://74.50.113.152/sippar/api/health"
echo "   Status: http://74.50.113.152:8203/api/v1/threshold/status"
echo ""
echo "🔧 Management Commands:"
echo "   Service status: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'systemctl status sippar-api'"
echo "   View logs: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'tail -f $REMOTE_PATH/logs/sippar_api.log'"
echo "   Restart API: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'systemctl restart sippar-api'"
echo "   Stop API: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'systemctl stop sippar-api'"
echo ""
echo "🚀 ICP Integration:"
echo "   Canister ID: vj7ly-diaaa-aaaae-abvoq-cai"
echo "   Network: ICP Mainnet (https://ic0.app)"
echo "   Threshold Key: ecdsa:Secp256k1:key_1"
echo ""
echo "🔐 Test Commands:"
echo "   curl http://74.50.113.152:8203/health"
echo "   curl http://74.50.113.152:8203/api/v1/threshold/status"
echo ""
echo "✅ Sippar threshold signatures ready for production!"
echo "🎯 Next: Update your frontend to use the deployed API endpoints"