#!/bin/bash
# AGGRESSIVE FIX: Move Sippar config BEFORE root location to make nuru.network/sippar work

set -e

VPS_IP="74.50.113.152"
SSH_KEY="~/.ssh/hivelocity_key"

echo "🔥 AGGRESSIVE NGINX FIX - Making nuru.network/sippar work!"

ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'

echo "📝 Creating backup..."
cp /etc/nginx/sites-available/nuru.network /etc/nginx/sites-available/nuru.network.backup.aggressive

echo "🔪 Removing existing Sippar configuration..."
sed -i '/# === Sippar Algorand Bridge ===/,/# === End Sippar Configuration ===/d' /etc/nginx/sites-available/nuru.network

echo "🎯 Finding root location and inserting Sippar config BEFORE it..."
ROOT_LINE=$(grep -n "location / {" /etc/nginx/sites-available/nuru.network | tail -1 | cut -d: -f1)
echo "Root location at line: $ROOT_LINE"

# Create temp file with Sippar config inserted before root location
head -n $((ROOT_LINE - 1)) /etc/nginx/sites-available/nuru.network > /tmp/nginx_new.conf

# Add Sippar configuration BEFORE root location
cat >> /tmp/nginx_new.conf << 'EOF'
    # === Sippar Algorand Bridge (PRIORITY BEFORE ROOT) ===
    
    # Sippar API Proxy (threshold signatures) - MUST come before root
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

    # Sippar React Frontend - MUST come before root
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

# Add the rest of the file (root location and everything after)
tail -n +$ROOT_LINE /etc/nginx/sites-available/nuru.network >> /tmp/nginx_new.conf

# Replace original with new config
mv /tmp/nginx_new.conf /etc/nginx/sites-available/nuru.network

echo "✅ Configuration updated - testing..."
nginx -t

if [ $? -eq 0 ]; then
    echo "🎉 Configuration valid - reloading nginx..."
    systemctl reload nginx
    echo "✅ SUCCESS! nuru.network/sippar should now work!"
else
    echo "❌ Configuration invalid - restoring backup..."
    cp /etc/nginx/sites-available/nuru.network.backup.aggressive /etc/nginx/sites-available/nuru.network
    systemctl reload nginx
    exit 1
fi

ENDSSH

echo ""
echo "🚀 DEPLOYMENT COMPLETE!"
echo "🌐 Testing nuru.network/sippar..."