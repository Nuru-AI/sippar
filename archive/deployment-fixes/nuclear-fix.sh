#!/bin/bash
# NUCLEAR OPTION: Add Sippar config at the VERY TOP with highest priority

set -e

VPS_IP="74.50.113.152"
SSH_KEY="~/.ssh/hivelocity_key"

echo "💥 NUCLEAR OPTION: Maximum priority Sippar config"

ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'

# Remove any Sippar config
sed -i '/# === Sippar/,/# === End Sippar/d' /etc/nginx/sites-available/nuru.network

# Find the first location block after the server starts
FIRST_LOCATION=$(grep -n "location" /etc/nginx/sites-available/nuru.network | head -1 | cut -d: -f1)
echo "First location at line: $FIRST_LOCATION"

# Insert Sippar config RIGHT AFTER the server { line and BEFORE any other location
head -n $((FIRST_LOCATION - 1)) /etc/nginx/sites-available/nuru.network > /tmp/nuclear_nginx.conf

# Add MAXIMUM PRIORITY Sippar config with exact match and prefix match
cat >> /tmp/nuclear_nginx.conf << 'NUCLEAR_SIPPAR'
    # === NUCLEAR SIPPAR - MAXIMUM PRIORITY ===
    
    # Exact match for /sippar - HIGHEST PRIORITY
    location = /sippar {
        return 301 /sippar/;
    }
    
    # Prefix match for /sippar/ - HIGHEST PRIORITY  
    location ^~ /sippar/ {
        alias /var/www/nuru.network/sippar-frontend/;
        try_files $uri $uri/ @sippar_fallback;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
            try_files $uri =404;
        }
        
        # HTML files - no cache
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            try_files $uri =404;
        }
    }
    
    # Fallback for Sippar SPA routing
    location @sippar_fallback {
        try_files /sippar/index.html =404;
    }
    
    # Exact match for Sippar API - HIGHEST PRIORITY
    location ^~ /api/sippar/ {
        proxy_pass http://localhost:8203/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            return 204;
        }
    }
    
    # === END NUCLEAR SIPPAR ===

NUCLEAR_SIPPAR

# Add the rest of the original config
tail -n +$FIRST_LOCATION /etc/nginx/sites-available/nuru.network >> /tmp/nuclear_nginx.conf

# Replace the config
mv /tmp/nuclear_nginx.conf /etc/nginx/sites-available/nuru.network

# Create clean symlink
rm -f /etc/nginx/sites-enabled/nuru.network
ln -sf /etc/nginx/sites-available/nuru.network /etc/nginx/sites-enabled/nuru.network

# Test and reload
nginx -t && systemctl reload nginx

echo "💥 NUCLEAR OPTION DEPLOYED - Sippar has MAXIMUM priority!"

ENDSSH

echo "🚀 Testing the NUCLEAR deployment..."