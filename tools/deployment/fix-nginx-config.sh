#!/bin/bash
# Fix Sippar nginx configuration - move it inside the HTTPS server block

set -e

VPS_IP="74.50.113.152"
SSH_KEY="~/.ssh/hivelocity_key"

echo "🔧 Fixing nginx configuration for Sippar..."

ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'

# Remove the incorrectly placed Sippar configuration (outside server blocks)
sed -i '/# === Sippar Algorand Bridge ===/,/# === End Sippar Configuration ===/d' /etc/nginx/sites-available/nuru.network

# Find the end of the HTTPS server block (before the closing brace) and add Sippar config there
# The HTTPS server block ends around line 443, so we'll insert before the last closing brace of that block

# Create a temporary file with the corrected configuration
cp /etc/nginx/sites-available/nuru.network /tmp/nuru.network.tmp

# Insert Sippar configuration before the closing brace of the HTTPS server block
sed -i '/^    }$/i \
\
    # === Sippar Algorand Bridge ===\
    \
    # Sippar API Proxy (threshold signatures)\
    location /api/sippar/ {\
        proxy_pass http://localhost:8203/;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        \
        # CORS headers for API access\
        add_header '\''Access-Control-Allow-Origin'\'' '\''*'\'' always;\
        add_header '\''Access-Control-Allow-Methods'\'' '\''GET, POST, OPTIONS'\'' always;\
        add_header '\''Access-Control-Allow-Headers'\'' '\''DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization'\'' always;\
        \
        # Handle preflight requests\
        if ($request_method = '\''OPTIONS'\'') {\
            return 204;\
        }\
    }\
\
    # Sippar React Frontend\
    location = /sippar {\
        return 301 /sippar/;\
    }\
\
    location /sippar/ {\
        alias /var/www/nuru.network/sippar-frontend/;\
        try_files $uri $uri/ /sippar/index.html;\
        \
        # Security headers\
        add_header X-Frame-Options "SAMEORIGIN" always;\
        add_header X-Content-Type-Options "nosniff" always;\
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;\
        \
        # Cache static assets\
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {\
            expires 1y;\
            add_header Cache-Control "public, immutable";\
            add_header Vary "Accept-Encoding";\
        }\
        \
        # Don'\''t cache HTML files\
        location ~* \\.html$ {\
            expires -1;\
            add_header Cache-Control "no-cache, no-store, must-revalidate";\
            add_header Pragma "no-cache";\
        }\
    }\
    \
    # === End Sippar Configuration ===' /tmp/nuru.network.tmp

# Replace the original file
mv /tmp/nuru.network.tmp /etc/nginx/sites-available/nuru.network

# Test nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
    echo "🔄 Nginx reloaded successfully"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

echo "🎉 Nginx configuration fixed!"

ENDSSH

echo "✅ Nginx configuration has been fixed!"
echo "🧪 Testing the deployment:"
echo ""