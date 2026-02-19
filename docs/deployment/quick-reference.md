# Sippar Deployment Quick Reference

## ⚡ **TL;DR Commands**

### **Deploy Frontend**
```bash
./tools/deployment/deploy-frontend.sh
```

### **Deploy Backend**  
```bash
./tools/deployment/deploy-backend.sh
```

### **Verify Deployment**
```bash
# Check frontend asset
curl -s https://nuru.network/sippar/ | grep -o "index.*\.js"

# Check backend health
curl http://nuru.network:3004/health
```

## 📍 **Critical Directory Mapping**

| Service | Local | Remote | URL |
|---------|-------|--------|-----|
| Frontend | `src/frontend/dist/` | `/var/www/nuru.network/sippar-frontend/` | https://nuru.network/sippar/ |
| Backend | `src/backend/dist/` | `/var/www/nuru.network/sippar-backend/` | http://nuru.network:3004/ |

## 🚨 **Never Deploy To These (REMOVED)**
- ~~`/var/www/nuru.network/sippar/`~~ ❌ **DELETED**
- ~~`/var/www/nuru.network/sippar-test.html`~~ ❌ **DELETED**

## 🔧 **Common Fix Commands**

### **Fix Permissions**
```bash
ssh root@74.50.113.152 "
chown -R www-data:www-data /var/www/nuru.network/sippar-frontend/
chown -R www-data:www-data /var/www/nuru.network/sippar-backend/
"
```

### **Restart Backend Service**
```bash
ssh root@74.50.113.152 "systemctl restart sippar-backend"
```

### **Check Service Status**
```bash
ssh root@74.50.113.152 "systemctl status sippar-backend"
```

## 🎯 **Troubleshooting Checklist**

### **Frontend Not Updating**
1. ✅ Check you deployed to `sippar-frontend/` not `sippar/`
2. ✅ Check asset hash changed: `curl -s https://nuru.network/sippar/ | grep index`
3. ✅ Hard refresh browser (Ctrl+Shift+R)

### **Backend API Failing**
1. ✅ Check service: `systemctl status sippar-backend`
2. ✅ Check port 3004: `curl http://nuru.network:3004/health`
3. ✅ Check logs: `journalctl -u sippar-backend -f`

### **Console 502 Errors**
1. ✅ Check frontend uses direct URLs: `http://nuru.network:3004`
2. ✅ NOT nginx proxy URLs: `~/api/sippar/~`
3. ✅ Redeploy frontend if using wrong URLs

## 📚 **Full Documentation**
- **Complete Structure**: `docs/deployment/structure.md`
- **Project Overview**: `CLAUDE.md`