#!/bin/bash
# FINAL FIX: Clean approach with proper nginx setup

set -e

VPS_IP="74.50.113.152"
SSH_KEY="~/.ssh/hivelocity_key"

echo "🎯 FINAL FIX: Creating clean nginx config with Sippar first"

ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'

# Remove any enabled files and work only with available
rm -f /etc/nginx/sites-enabled/nuru.network*

# Remove Sippar config from current file (clean slate)
sed -i '/# === Sippar Algorand Bridge/,/# === End Sippar Configuration ===/d' /etc/nginx/sites-available/nuru.network

# Find the root location line
ROOT_LINE=$(grep -n "^    location / {" /etc/nginx/sites-available/nuru.network | head -1 | cut -d: -f1)
echo "Root location at line: $ROOT_LINE"

# Create new config with Sippar BEFORE root
head -n $((ROOT_LINE - 1)) /etc/nginx/sites-available/nuru.network > /tmp/clean_nginx.conf

# Add Sippar config RIGHT BEFORE root location
cat >> /tmp/clean_nginx.conf << 'SIPPAR_CONFIG'
    # === SIPPAR FIRST - PRIORITY ROUTING ===
    
    # Sippar API - Must be before root location
    location /api/sippar/ {
        proxy_pass http://localhost:8203/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Sippar Frontend - Must be before root location  
    location = /sippar {
        return 301 /sippar/;
    }

    location /sippar/ {
        alias /var/www/nuru.network/sippar-frontend/;
        try_files $uri $uri/ /sippar/index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # === END SIPPAR CONFIG ===

SIPPAR_CONFIG

# Add the rest of the file (from root location onwards)
tail -n +$ROOT_LINE /etc/nginx/sites-available/nuru.network >> /tmp/clean_nginx.conf

# Replace the original
mv /tmp/clean_nginx.conf /etc/nginx/sites-available/nuru.network

# Create proper symlink
ln -sf /etc/nginx/sites-available/nuru.network /etc/nginx/sites-enabled/nuru.network

# Test and reload
nginx -t && systemctl reload nginx

echo "✅ Clean nginx configuration complete!"

ENDSSH

echo "🚀 TESTING nuru.network/sippar..."