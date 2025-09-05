# Sippar Deployment Structure

## 🏗️ **Standardized Directory Layout**

### **Production Server: nuru.network (74.50.113.152)**

```
/var/www/nuru.network/
├── sippar/                          # 🚫 DEPRECATED - Remove this directory
├── sippar-frontend/                 # ✅ ACTIVE - Frontend files (React SPA)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   └── chunks/
│       └── vendor-[hash].js
├── sippar-backend/                  # ✅ ACTIVE - Backend service
│   ├── dist/
│   │   └── server.js
│   ├── package.json
│   └── node_modules/
└── sippar-test.html                 # 🚫 CLEANUP - Remove test file
```

## 🌐 **Nginx Configuration**

### **URL Routing**
- **Frontend**: `https://nuru.network/sippar/` → `/var/www/nuru.network/sippar-frontend/`
- **Backend API**: `https://nuru.network/api/sippar/` → `http://localhost:3004/`

### **Service Ports**
- **Backend**: Port 3004 (systemd service: `sippar-backend`)
- **Direct Access**: `http://nuru.network:3004/` (firewall open for bypass)

## 🚀 **Deployment Process**

### **Automated Deployment (Recommended)**
```bash
# Deploy frontend
./tools/deployment/deploy-frontend.sh

# Deploy backend
./tools/deployment/deploy-backend.sh
```

### **Manual Frontend Deployment (Reference Only)**
```bash
# 1. Build locally
cd src/frontend
npm run build

# 2. Package (exclude macOS metadata)
tar --exclude="._*" -czf sippar-frontend-dist.tar.gz dist/

# 3. Deploy to correct directory
scp sippar-frontend-dist.tar.gz root@74.50.113.152:/tmp/
ssh root@74.50.113.152 "
  cd /var/www/nuru.network/sippar-frontend
  rm -rf *
  tar -xzf /tmp/sippar-frontend-dist.tar.gz --strip-components=1
  chown -R www-data:www-data /var/www/nuru.network/sippar-frontend
  rm /tmp/sippar-frontend-dist.tar.gz
"
```

### **Manual Backend Deployment (Reference Only)**
```bash
# 1. Build locally  
cd src/backend
npm run build

# 2. Package
tar -czf sippar-backend-dist.tar.gz dist/ package.json

# 3. Deploy and restart service
scp sippar-backend-dist.tar.gz root@74.50.113.152:/tmp/
ssh root@74.50.113.152 "
  cd /var/www/nuru.network/sippar-backend
  systemctl stop sippar-backend
  rm -rf dist/
  tar -xzf /tmp/sippar-backend-dist.tar.gz
  npm ci --only=production
  chown -R www-data:www-data /var/www/nuru.network/sippar-backend
  systemctl start sippar-backend
  rm /tmp/sippar-backend-dist.tar.gz
"
```

## ⚠️ **Common Deployment Issues**

### **Issue 1: Wrong Directory**
- **Problem**: Deploying to `/sippar/` instead of `/sippar-frontend/`
- **Solution**: Always check nginx config first: `grep sippar /etc/nginx/sites-available/nuru.network`

### **Issue 2: macOS Metadata**
- **Problem**: `._*` files in tar archives break extraction
- **Solution**: Always use `tar --exclude="._*"` when creating archives

### **Issue 3: Cache Issues**
- **Problem**: Nginx serving old cached files
- **Solution**: Verify file timestamps and reload nginx: `nginx -s reload`

### **Issue 4: Permission Problems**
- **Problem**: Files not accessible by web server
- **Solution**: Always run `chown -R www-data:www-data` after deployment

## 🧪 **Verification Steps**

### **Frontend Verification**
```bash
# Check asset names match
curl -s https://nuru.network/sippar/ | grep -o "index.*\.js"
ssh root@74.50.113.152 "ls /var/www/nuru.network/sippar-frontend/assets/"

# Verify no console errors
# Open https://nuru.network/sippar/ and check developer console
```

### **Backend Verification**
```bash
# Test health endpoint
curl http://nuru.network:3004/health

# Test API endpoints
curl http://nuru.network:3004/api/ai/status

# Check service status
ssh root@74.50.113.152 "systemctl status sippar-backend"
```

## 📋 **Cleanup Actions**

### **Remove Redundant Directories**
```bash
ssh root@74.50.113.152 "
  rm -rf /var/www/nuru.network/sippar
  rm /var/www/nuru.network/sippar-test.html
"
```

### **Verify Only Correct Directories Exist**
```bash
ssh root@74.50.113.152 "
  ls -la /var/www/nuru.network/ | grep sippar
  # Should only show:
  # sippar-frontend/ 
  # sippar-backend/
"
```