# 🐳 UBUNIFU SEC SMS - Docker Deployment Guide

## 🚀 **Quick Start Commands**

### **Start All Services:**
```bash
docker-compose up -d
```

### **Stop All Services:**
```bash
docker-compose down
```

### **Restart All Services:**
```bash
docker-compose restart
```

---

## 📋 **Current System Status**

Your SMS system runs these containers:
- **Frontend**: React app served by Nginx (Port 3000)
- **Backend**: Node.js API server (Port 5000) 
- **Database**: MySQL 8.0 (Port 3307)

---

## 🔧 **Daily Management Commands**

### **1. Check System Status:**
```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Check container logs
docker-compose logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs db
```

### **2. Start/Stop Individual Services:**
```bash
# Start specific service
docker-compose up -d frontend
docker-compose up -d backend
docker-compose up -d db

# Stop specific service
docker-compose stop frontend
docker-compose stop backend
docker-compose stop db

# Restart specific service
docker-compose restart frontend
```

### **3. Update Code Changes:**
```bash
# Stop all services
docker-compose down

# Rebuild containers with new code (when internet works)
docker-compose build --no-cache

# Start with updated containers
docker-compose up -d
```

---

## 🌐 **Accessing Your Application**

### **Local Access:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:3307 (username: sms_user, password: allahuma)

### **Production Access (via Cloudflare):**
- Your domain should point to your server's IP
- Cloudflare handles SSL and CDN

---

## ⚡ **Quick Fixes for Common Issues**

### **If Containers Won't Start:**
```bash
# Check logs for errors
docker-compose logs

# Remove and recreate containers
docker-compose down
docker-compose up -d
```

### **If Database Issues:**
```bash
# Restart just the database
docker-compose restart db

# Check database logs
docker-compose logs db
```

### **If Frontend Not Loading:**
```bash
# Restart frontend container
docker-compose restart frontend

# Check frontend logs
docker-compose logs frontend
```

### **If Backend API Not Working:**
```bash
# Restart backend container
docker-compose restart backend

# Check backend logs
docker-compose logs backend
```

---

## 📊 **Monitoring Commands**

### **Real-time Logs:**
```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f frontend
```

### **Resource Usage:**
```bash
# Show container resource usage
docker stats

# Show disk usage
docker system df
```

### **Health Checks:**
```bash
# Manual health check
curl http://localhost:3000  # Frontend
curl http://localhost:5000/api/health  # Backend
```

---

## 🔒 **Security & Backup**

### **Backup Database:**
```bash
# Create database backup
docker exec sms-mysql mysqldump -u sms_user -pallahuma sms_database > backup_$(date +%Y%m%d).sql

# Restore database from backup
docker exec -i sms-mysql mysql -u sms_user -pallahuma sms_database < backup_20241212.sql
```

### **View Environment Variables:**
```bash
# Check current environment
docker-compose config
```

---

## 🚨 **Troubleshooting Network Issues**

If you get network errors when building:

### **Option 1: Use Docker Desktop**
- Open Docker Desktop
- Go to Settings → Resources → Network
- Try changing DNS to 8.8.8.8, 8.8.4.4

### **Option 2: Use Mobile Hotspot**
- Connect to mobile hotspot temporarily
- Run: `docker-compose build --no-cache`
- Switch back to regular internet

### **Option 3: Build on Different Network**
- Try from a different internet connection
- University/office networks sometimes work better

---

## 📝 **Updating Code Changes**

### **After PC Restart:**
1. Open PowerShell in `C:\sms` directory
2. Run: `docker-compose up -d`
3. Wait for containers to be healthy
4. Access your app at http://localhost:3000

### **After Code Changes:**
1. Stop containers: `docker-compose down`
2. Rebuild (when internet works): `docker-compose build --no-cache`
3. Start updated containers: `docker-compose up -d`

---

## 🌍 **Production Deployment with Cloudflare**

### **If Running on Remote Server:**
1. **SSH to your server**
2. **Pull latest code**: `git pull origin main`
3. **Rebuild containers**: `docker-compose build --no-cache`
4. **Restart services**: `docker-compose down && docker-compose up -d`

### **Cloudflare Configuration:**
- Ensure your domain points to server IP
- SSL/TLS should be "Flexible" or "Full"
- Port 3000 should be exposed for frontend

---

## 🆘 **Emergency Commands**

### **Complete System Reset:**
```bash
# WARNING: This removes all containers and data!
docker-compose down -v
docker system prune -a
docker volume prune

# Then rebuild everything:
docker-compose up -d
```

### **Restart Docker Service (Windows):**
```powershell
# Run as Administrator
Restart-Service com.docker.service
```

---

## 📞 **Support Checklist**

When reporting issues, provide:
1. Output of `docker ps -a`
2. Output of `docker-compose logs`
3. What you were trying to do
4. Error messages received
5. Your operating system and Docker version

---

## ✅ **Success Indicators**

Your system is working correctly when:
- ✅ All containers show "healthy" status
- ✅ Frontend loads at http://localhost:3000
- ✅ You can login to the SMS system
- ✅ API responses work (check Network tab in browser)
- ✅ No error messages in logs

---

*Remember: Your responsive design changes are in the code. When you rebuild the frontend container (when internet works), they'll be applied to the live system!*
