#!/bin/bash
# Final fix: Move Sippar configuration BEFORE the root location block

set -e

VPS_IP="74.50.113.152"
SSH_KEY="~/.ssh/hivelocity_key"

echo "🔧 Final nginx fix: Moving Sippar config before root location..."

ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'

# Backup current config
cp /etc/nginx/sites-available/nuru.network /etc/nginx/sites-available/nuru.network.backup.final

# Remove existing Sippar configuration
sed -i '/# === Sippar Algorand Bridge ===/,/# === End Sippar Configuration ===/d' /etc/nginx/sites-available/nuru.network

# Find the line number of the root location block
ROOT_LOCATION_LINE=$(grep -n "location / {" /etc/nginx/sites-available/nuru.network | tail -1 | cut -d: -f1)
echo "Root location starts at line: $ROOT_LOCATION_LINE"

# Insert Sippar configuration BEFORE the root location block
head -n $((ROOT_LOCATION_LINE - 1)) /etc/nginx/sites-available/nuru.network > /tmp/nuru_fixed.conf

cat >> /tmp/nuru_fixed.conf << 'EOF'

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

# Add the rest of the file (from the root location onwards)
tail -n +$ROOT_LOCATION_LINE /etc/nginx/sites-available/nuru.network >> /tmp/nuru_fixed.conf

# Replace the original file
mv /tmp/nuru_fixed.conf /etc/nginx/sites-available/nuru.network

# Test nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
    echo "🔄 Nginx reloaded successfully"
    echo ""
    echo "🎉 Sippar should now be accessible!"
else
    echo "❌ Nginx configuration error - restoring backup"
    cp /etc/nginx/sites-available/nuru.network.backup.final /etc/nginx/sites-available/nuru.network
    exit 1
fi

ENDSSH

echo "✅ Final nginx fix complete!"
echo ""
echo "🧪 Testing the deployment:"