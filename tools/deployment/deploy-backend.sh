#!/bin/bash
# Deploy Sippar TypeScript Backend with AI Integration
set -e

VPS_IP="74.50.113.152"
VPS_USER="root"
SSH_KEY="~/.ssh/hivelocity_key"
BACKEND_DIR="/var/www/nuru.network/sippar-backend"

echo "🚀 Deploying Sippar TypeScript Backend with AI Integration"

# Build backend
cd src/backend
echo "📦 Building backend..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf sippar-backend-dist.tar.gz \
    dist/ \
    package.json

# Upload to VPS
echo "📤 Uploading backend to VPS..."
scp -i ${SSH_KEY} sippar-backend-dist.tar.gz root@${VPS_IP}:/tmp/

# Deploy on VPS
echo "🔧 Deploying backend on VPS..."
ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'
# Create backend directory
mkdir -p /var/www/nuru.network/sippar-backend
cd /var/www/nuru.network/sippar-backend

# Stop existing service if running
systemctl stop sippar-backend || echo "No existing service"

# Extract files
tar -xzf /tmp/sippar-backend-dist.tar.gz

# Install dependencies
npm ci --only=production

# Set permissions
chown -R www-data:www-data /var/www/nuru.network/sippar-backend
chmod -R 755 /var/www/nuru.network/sippar-backend

# Create systemd service
cat > /etc/systemd/system/sippar-backend.service << 'EOF'
[Unit]
Description=Sippar TypeScript Backend with AI Integration
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/nuru.network/sippar-backend
ExecStart=/usr/bin/node dist/server.js
Environment=NODE_ENV=production
Environment=PORT=3001
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sippar-backend

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
systemctl daemon-reload
systemctl enable sippar-backend
systemctl start sippar-backend

# Clean up
rm /tmp/sippar-backend-dist.tar.gz

echo "✅ Backend service started"
ENDSSH

echo "⚙️  Updating nginx configuration for backend..."
ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'
# Update nginx config to proxy to Node.js backend on port 3001
sed -i 's/proxy_pass http:\/\/localhost:8203\//proxy_pass http:\/\/localhost:3001\//' /etc/nginx/sites-available/nuru.network

# Test and reload nginx
nginx -t && systemctl reload nginx
ENDSSH

echo "🧪 Testing deployment..."
sleep 3
curl -s https://nuru.network/api/sippar/health | head -5

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Backend API: https://nuru.network/api/sippar/"
echo "🤖 AI Status: https://nuru.network/api/sippar/ai/status"
echo "🎯 Frontend: https://nuru.network/sippar/"