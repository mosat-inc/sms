# 🚀 **Production Deployment Guide**
## **UBUNIFU SEC - School Management System**

This guide provides step-by-step instructions for deploying the School Management System to production.

---

## ⚠️ **Pre-Deployment Checklist**

**CRITICAL:** Complete ALL items before deployment:

### **🔒 Security Requirements**
- [ ] Generate new JWT secret for production
- [ ] Remove hardcoded database passwords
- [ ] Set up SSL certificates (HTTPS)
- [ ] Configure firewall rules
- [ ] Enable production logging

### **🗄️ Database Requirements**
- [ ] Set up production MySQL database
- [ ] Create database user with limited privileges
- [ ] Run database optimization script
- [ ] Set up automated backups
- [ ] Test database connectivity

### **🔧 System Requirements**
- [ ] Node.js 16+ installed
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] MySQL 8.0+ running
- [ ] Nginx configured (optional)
- [ ] SSL certificates obtained

---

## 📋 **Step-by-Step Deployment**

### **Step 1: Server Preparation**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install MySQL (if not already installed)
sudo apt install mysql-server -y

# Create deployment directory
sudo mkdir -p /var/www/ubunifu-sms
sudo chown $USER:$USER /var/www/ubunifu-sms
```

### **Step 2: Database Setup**

```bash
# Connect to MySQL
sudo mysql -u root -p

# Create production database and user
CREATE DATABASE sms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sms_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_database.* TO 'sms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **Step 3: Application Deployment**

```bash
# Clone the repository
cd /var/www/ubunifu-sms
git clone <your-repository-url> .

# Install server dependencies
npm install --production

# Install client dependencies and build
cd client
npm install --production
npm run build
cd ..

# Create production environment file
cp server/.env.example server/.env.production
```

### **Step 4: Environment Configuration**

Edit `/var/www/ubunifu-sms/server/.env.production`:

```bash
# CRITICAL: Change all default values for production
NODE_ENV=production
PORT=5000

# Security - GENERATE NEW VALUES
JWT_SECRET=your-super-secure-jwt-secret-256-bits-long
BCRYPT_ROUNDS=12

# Database - Use production credentials
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sms_database
DB_USER=sms_user
DB_PASSWORD=your-secure-database-password

# Application
FRONTEND_URL=https://your-domain.com

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000
```

### **Step 5: Database Optimization**

```bash
# Run database optimization script
mysql -u sms_user -p sms_database < server/scripts/optimize-database.sql

# Initialize database schema
NODE_ENV=production node server/server.js --init-db
```

### **Step 6: SSL Configuration (HTTPS)**

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Test certificate renewal
sudo certbot renew --dry-run
```

### **Step 7: Nginx Configuration (Optional but Recommended)**

Create `/etc/nginx/sites-available/ubunifu-sms`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Serve static files
    location / {
        root /var/www/ubunifu-sms/client/build;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000;
        access_log off;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ubunifu-sms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 8: Start Application with PM2**

```bash
cd /var/www/ubunifu-sms

# Start application in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the above command

# Monitor the application
pm2 monit
```

---

## 🔍 **Post-Deployment Verification**

### **Health Checks**

```bash
# Check application health
curl https://your-domain.com/health

# Check detailed health
curl https://your-domain.com/health/detailed

# Check API connectivity
curl https://your-domain.com/api/auth/profile
```

### **Performance Tests**

```bash
# Install Apache Bench for testing
sudo apt install apache2-utils -y

# Test homepage
ab -n 100 -c 10 https://your-domain.com/

# Test API endpoint
ab -n 100 -c 10 https://your-domain.com/health
```

### **Log Verification**

```bash
# Check application logs
pm2 logs ubunifu-sms

# Check system logs
sudo journalctl -u nginx -f

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

---

## 📊 **Monitoring Setup**

### **Basic Monitoring Commands**

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
free -h
df -h

# Database status
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

### **Log Rotation Setup**

```bash
# Configure logrotate for application logs
sudo nano /etc/logrotate.d/ubunifu-sms
```

Add:
```
/var/www/ubunifu-sms/server/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 🔄 **Maintenance Procedures**

### **Application Updates**

```bash
# Pull latest code
cd /var/www/ubunifu-sms
git pull origin main

# Update dependencies
npm install --production

# Rebuild client
cd client
npm install --production
npm run build
cd ..

# Restart application
pm2 reload ubunifu-sms
```

### **Database Backups**

```bash
# Create backup script
sudo nano /opt/backup-sms.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/backup/sms"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u sms_user -p sms_database > $BACKUP_DIR/sms_db_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/sms_app_$DATE.tar.gz /var/www/ubunifu-sms

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Make executable and schedule:
```bash
sudo chmod +x /opt/backup-sms.sh
sudo crontab -e
# Add: 0 2 * * * /opt/backup-sms.sh
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

**Application Won't Start:**
```bash
# Check PM2 logs
pm2 logs ubunifu-sms

# Check environment variables
pm2 show ubunifu-sms

# Restart with debug
NODE_ENV=production DEBUG=* node server/server.js
```

**Database Connection Issues:**
```bash
# Test database connection
mysql -u sms_user -p sms_database -e "SELECT 1;"

# Check MySQL status
sudo systemctl status mysql
```

**High Memory Usage:**
```bash
# Monitor memory
pm2 monit

# Restart if needed
pm2 restart ubunifu-sms
```

---

## ✅ **Final Production Checklist**

- [ ] Application starts without errors
- [ ] Health checks return 200 status
- [ ] HTTPS is working correctly
- [ ] Database connections are successful
- [ ] Logs are being written correctly
- [ ] PM2 auto-restart is configured
- [ ] Backups are scheduled
- [ ] Monitoring is in place
- [ ] Security headers are configured
- [ ] Rate limiting is working

---

**🎉 Congratulations! Your UBUNIFU SEC School Management System is now running in production.**

For support, check the logs first, then contact the development team with specific error messages and system information.
