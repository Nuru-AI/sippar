#!/bin/bash
# Properly add Sippar configuration to nginx

set -e

VPS_IP="74.50.113.152"
SSH_KEY="~/.ssh/hivelocity_key"

echo "🔧 Adding Sippar configuration to nginx correctly..."

ssh -i ${SSH_KEY} root@${VPS_IP} << 'ENDSSH'

# Find the line number where the main server block ends (before the HTTP redirect server)
# This should be around the location with "try_files $uri $uri/ /index.html;"

# First, let's see the structure
echo "📖 Checking nginx structure..."
grep -n "try_files.*index.html" /etc/nginx/sites-available/nuru.network

# Add Sippar configuration just before the final location block of the main server
# Find the line with the last location block before the closing brace

# Create new configuration with Sippar added in the right place
cat > /tmp/sippar_config.txt << 'EOF'

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

# Insert the configuration right before the last closing brace of the main server block
# The main server block is the HTTPS one, and ends around line 444

# Find the line number of the main server block's closing brace
MAIN_SERVER_END=$(grep -n "^}" /etc/nginx/sites-available/nuru.network | head -1 | cut -d: -f1)
echo "Main server block ends at line: $MAIN_SERVER_END"

# Insert our configuration before that line
head -n $((MAIN_SERVER_END - 1)) /etc/nginx/sites-available/nuru.network > /tmp/nuru_new.conf
cat /tmp/sippar_config.txt >> /tmp/nuru_new.conf
tail -n +$MAIN_SERVER_END /etc/nginx/sites-available/nuru.network >> /tmp/nuru_new.conf

# Replace the original file
mv /tmp/nuru_new.conf /etc/nginx/sites-available/nuru.network

# Clean up
rm /tmp/sippar_config.txt

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

ENDSSH

echo "✅ Nginx configuration has been properly added!"
echo "🧪 Testing the API..."