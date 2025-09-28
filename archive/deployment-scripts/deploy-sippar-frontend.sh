#!/bin/bash
# Sippar Frontend Deployment Script
# Deploys React frontend to nuru.network/sippar

set -e

VPS_IP="74.50.113.152"
VPS_USER="root"
SSH_KEY="~/.ssh/hivelocity_key"
FRONTEND_DIR="/var/www/nuru.network/sippar-frontend"

echo "🚀 Deploying Sippar React Frontend to nuru.network/sippar"

# Check if build exists
if [ ! -f "sippar-frontend-dist.tar.gz" ]; then
    echo "❌ Build package not found. Run 'tar -czf sippar-frontend-dist.tar.gz -C dist .' first"
    exit 1
fi

echo "📦 Uploading frontend build to VPS..."
scp -i ${SSH_KEY} sippar-frontend-dist.tar.gz root@${VPS_IP}:/tmp/

echo "🔧 Deploying files on VPS..."
ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'
# Create frontend directory
mkdir -p /var/www/nuru.network/sippar-frontend

# Extract build files
cd /var/www/nuru.network/sippar-frontend
tar -xzf /tmp/sippar-frontend-dist.tar.gz

# Set proper permissions
chown -R www-data:www-data /var/www/nuru.network/sippar-frontend
chmod -R 755 /var/www/nuru.network/sippar-frontend

# Clean up
rm /tmp/sippar-frontend-dist.tar.gz

echo "✅ Frontend files deployed successfully"
ENDSSH

echo "⚙️  Configuring nginx routing..."
ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'
# Backup current nginx config
cp /etc/nginx/sites-available/nuru.network /etc/nginx/sites-available/nuru.network.backup.$(date +%Y%m%d_%H%M%S)

# Add Sippar routing to nginx config
cat >> /etc/nginx/sites-available/nuru.network << 'EOF'

    # === Sippar Algorand Bridge ===
    
    # Sippar API Proxy (threshold signatures)
    location /api/sippar/ {
        proxy_pass http://localhost:8203/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for API access
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Sippar React Frontend
    location = /sippar {
        return 301 /sippar/;
    }

    location /sippar/ {
        alias /var/www/nuru.network/sippar-frontend/;
        try_files $uri $uri/ /sippar/index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
        
        # Don't cache HTML files
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
        }
    }
    
    # === End Sippar Configuration ===
EOF

# Test nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
    echo "🔄 Nginx reloaded successfully"
else
    echo "❌ Nginx configuration error - rolling back"
    cp /etc/nginx/sites-available/nuru.network.backup.$(ls -t /etc/nginx/sites-available/nuru.network.backup.* | head -1 | cut -d'.' -f3-) /etc/nginx/sites-available/nuru.network
    exit 1
fi

echo "🎉 Sippar frontend deployment complete!"
echo "🌐 Available at: https://nuru.network/sippar/"
echo "🔧 API available at: https://nuru.network/api/sippar/"
ENDSSH

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Sippar is now live at: https://nuru.network/sippar/"
echo "🔧 API endpoints: https://nuru.network/api/sippar/"
echo ""
echo "🧪 Test the deployment:"
echo "curl -s https://nuru.network/api/sippar/health | jq ."