#!/bin/bash
# Deploy Sippar React Frontend to Correct Directory
set -e

VPS_IP="74.50.113.152"
VPS_USER="root"
SSH_KEY="~/.ssh/hivelocity_key"
FRONTEND_DIR="/var/www/nuru.network/sippar-frontend"

echo "🚀 Deploying Sippar React Frontend"

# Build frontend
cd src/frontend
echo "📦 Building frontend..."
npm run build

# Create deployment package (exclude macOS metadata)
echo "📦 Creating deployment package..."
tar --exclude="._*" -czf sippar-frontend-dist.tar.gz dist/

# Upload to VPS
echo "📤 Uploading frontend to VPS..."
scp -i ${SSH_KEY} sippar-frontend-dist.tar.gz root@${VPS_IP}:/tmp/

# Deploy on VPS
echo "🔧 Deploying frontend on VPS..."
ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'
# Clear existing frontend files
cd /var/www/nuru.network/sippar-frontend
echo "🧹 Clearing existing frontend files..."
rm -rf *

# Extract new files (strip dist/ prefix)
echo "📂 Extracting new frontend files..."
tar -xzf /tmp/sippar-frontend-dist.tar.gz --strip-components=1

# Set correct permissions
echo "🔧 Setting permissions..."
chown -R www-data:www-data /var/www/nuru.network/sippar-frontend

# Verify deployment
echo "✅ Verifying deployment..."
ls -la assets/ | head -3

# Clean up
rm /tmp/sippar-frontend-dist.tar.gz

echo "✅ Frontend deployed to sippar-frontend/"
ENDSSH

echo "🧪 Testing deployment..."
sleep 2

# Test frontend is accessible
echo "🌐 Testing frontend accessibility..."
ASSET_NAME=$(curl -s https://nuru.network/sippar/ | grep -o "index.*\.js" | head -1)
echo "📄 Serving asset: ${ASSET_NAME}"

# Verify asset exists on server
ssh -i ${SSH_KEY} root@${VPS_IP} "
echo '📁 Assets on server:'
ls /var/www/nuru.network/sippar-frontend/assets/index*.js
"

echo ""
echo "✅ Frontend Deployment Complete!"
echo "🌐 Frontend URL: https://nuru.network/sippar/"
echo "📄 Asset served: ${ASSET_NAME}"
echo "🔍 Check console at: https://nuru.network/sippar/ (F12 → Console)"