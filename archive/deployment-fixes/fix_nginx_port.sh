#!/bin/bash

echo "📝 Backing up current nginx config..."
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%s)

echo "🔧 Updating nginx config to proxy to port 3004 instead of 8203..."
sed -i 's|proxy_pass http://localhost:8203/;|proxy_pass http://localhost:3004/;|g' /etc/nginx/sites-available/default

echo "✅ Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "🚀 Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx configuration updated successfully!"
    echo "📊 New configuration:"
    grep -A 2 -B 2 "proxy_pass.*3004" /etc/nginx/sites-available/default
else
    echo "❌ Nginx configuration test failed. Restoring backup..."
    cp /etc/nginx/sites-available/default.backup.* /etc/nginx/sites-available/default
    systemctl reload nginx
fi
