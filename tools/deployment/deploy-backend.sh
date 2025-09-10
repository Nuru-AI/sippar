#!/bin/bash
# Deploy Sippar TypeScript Backend with AI Integration
set -e

echo "🚀 Deploying Sippar Backend with AI Endpoints"

# Build backend
cd src/backend
echo "📦 Building backend..."
npm run build

# Create deployment package (include package.json for production dependencies)
echo "📦 Creating deployment package..."
tar -czf sippar-backend-dist.tar.gz dist/ package.json

# Upload to VPS (using SSH key authentication)
echo "📤 Uploading backend to VPS..."
scp -i ~/.ssh/hivelocity_key -o StrictHostKeyChecking=no sippar-backend-dist.tar.gz root@74.50.113.152:/tmp/

# Deploy on VPS
echo "🔧 Deploying backend on VPS..."
ssh -i ~/.ssh/hivelocity_key -o StrictHostKeyChecking=no root@74.50.113.152 << 'ENDSSH'
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
Environment=PORT=3004
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

echo "⚙️  Backend service should now be running on port 3004..."

echo "🧪 Testing deployment..."
sleep 3
curl -s https://nuru.network/api/sippar/health | head -5

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Backend API: https://nuru.network/api/sippar/"
echo "🤖 AI Status: https://nuru.network/api/sippar/ai/status"
echo "🎯 Frontend: https://nuru.network/sippar/"