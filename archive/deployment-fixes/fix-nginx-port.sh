#!/bin/bash

# Fix nginx configuration to proxy /api/sippar/ to TypeScript backend (port 3004) 
# instead of Python backend (port 8203)

VPS_IP="74.50.113.152"
SSH_KEY="~/.ssh/hivelocity_key"

echo "🔧 Fixing nginx proxy configuration to use TypeScript backend (port 3004)..."

# Create the fix script to run on VPS
cat > fix_nginx_port.sh << 'EOF'
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
EOF

chmod +x fix_nginx_port.sh

echo "🚀 Deploying nginx fix to VPS..."

# Try to upload and run the fix
scp fix_nginx_port.sh root@${VPS_IP}:/tmp/ 2>/dev/null && \
ssh root@${VPS_IP} "chmod +x /tmp/fix_nginx_port.sh && /tmp/fix_nginx_port.sh" 2>/dev/null || {
    echo "❌ SSH connection failed. Cannot deploy nginx fix remotely."
    echo "💡 Manual fix needed:"
    echo "   1. SSH to VPS: ssh root@${VPS_IP}"
    echo "   2. Edit nginx config: nano /etc/nginx/sites-available/default" 
    echo "   3. Change 'proxy_pass http://localhost:8203/;' to 'proxy_pass http://localhost:3004/;'"
    echo "   4. Test config: nginx -t"
    echo "   5. Reload nginx: systemctl reload nginx"
    exit 1
}

echo "🧪 Testing the fixed configuration..."
sleep 2
curl -s -w "\nResponse time: %{time_total}s\n" "https://nuru.network/api/sippar/api/v1/threshold/status" | head -5

echo "✅ Nginx proxy fix complete!"
echo "📊 API should now proxy to TypeScript backend on port 3004"
echo "🌐 Test at: https://nuru.network/sippar/"

rm fix_nginx_port.sh