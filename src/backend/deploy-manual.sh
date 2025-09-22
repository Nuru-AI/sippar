#!/bin/bash
# Manual X402 deployment - upload only built files

echo "🚀 Manual X402 Deployment"

# Create deployment package with just built files
tar -czf sippar-x402-manual.tar.gz dist/

# Upload to VPS 
scp -i ~/.ssh/hivelocity_key -o StrictHostKeyChecking=no sippar-x402-manual.tar.gz root@74.50.113.152:/tmp/

# Deploy on VPS (use existing node_modules)
ssh -i ~/.ssh/hivelocity_key -o StrictHostKeyChecking=no root@74.50.113.152 << 'ENDSSH'
cd /var/www/nuru.network/sippar-backend

# Stop service
systemctl stop sippar-backend

# Backup current dist
mv dist dist-backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# Extract new dist
tar -xzf /tmp/sippar-x402-manual.tar.gz

# Set permissions
chown -R www-data:www-data dist/
chmod -R 755 dist/

# Start service
systemctl start sippar-backend

# Clean up
rm /tmp/sippar-x402-manual.tar.gz

echo "✅ Manual deployment complete"
ENDSSH

echo "🧪 Testing X402 endpoints..."
sleep 5
curl -s "https://nuru.network/api/sippar/x402/agent-marketplace" | head -10
