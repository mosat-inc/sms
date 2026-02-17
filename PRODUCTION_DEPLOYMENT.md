# School Management System - Production Deployment Guide

This guide provides step-by-step instructions for deploying the School Management System in a production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Process](#deployment-process)
6. [Security Hardening](#security-hardening)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Performance Optimization](#performance-optimization)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or CentOS 8+ (recommended)
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 20GB, Recommended 50GB+ SSD
- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **Network**: Stable internet connection with static IP

### Software Requirements

- Node.js 18.x or higher
- MySQL 8.0 or higher
- Nginx or Apache web server
- SSL certificate (Let's Encrypt recommended)
- PM2 or similar process manager

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server mysql-client

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Create Application User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash smsapp
sudo usermod -aG sudo smsapp

# Switch to application user
sudo su - smsapp
```

### 3. Clone and Setup Application

```bash
# Clone the repository
git clone https://github.com/your-repo/school-management-system.git
cd school-management-system/server

# Install dependencies
npm ci --only=production

# Create necessary directories
mkdir -p logs uploads backups
chmod 755 logs uploads backups
```

## Database Configuration

### 1. MySQL Setup

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE school_management_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user
CREATE USER 'sms_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- Grant permissions
GRANT ALL PRIVILEGES ON school_management_system.* TO 'sms_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### 2. Database Configuration

Edit MySQL configuration for production:

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add/modify these settings:

```ini
[mysqld]
# Performance settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
query_cache_size = 128M
query_cache_limit = 2M

# Connection settings
max_connections = 200
wait_timeout = 600
interactive_timeout = 600

# Security settings
bind-address = 127.0.0.1
skip-name-resolve
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

## Environment Configuration

### 1. Create Production Environment File

```bash
cp .env.production .env
nano .env
```

Configure the following critical settings:

```env
# Security - Generate strong secrets
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_minimum_32_characters
JWT_REFRESH_SECRET=your_very_long_and_secure_refresh_secret_key_here_minimum_32_characters

# Database
DB_HOST=localhost
DB_USER=sms_user
DB_PASSWORD=your_secure_password_here
DB_NAME=school_management_system

# Domain and CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Email (configure your SMTP provider)
SMTP_HOST=smtp.youremailprovider.com
SMTP_USER=your_email@yourdomain.com
SMTP_PASS=your_email_password
```

### 2. Generate Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

## Deployment Process

### 1. Automated Deployment

Use the provided deployment script:

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh production
```

### 2. Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Install dependencies
npm ci --only=production

# 2. Run database migrations
node -e "
const { initializeDatabase } = require('./config/database');
initializeDatabase().then(() => console.log('Database ready')).catch(console.error);
"

# 3. Build frontend (if applicable)
cd ../client && npm run build && cd ../server

# 4. Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'school-management-system',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF

# 5. Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3306/tcp  # MySQL (only if needed externally)
```

### 2. Nginx Configuration

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/school-management-system
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Serve static files directly
    location /uploads/ {
        alias /home/smsapp/school-management-system/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Proxy API requests
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Serve React app
    location / {
        root /home/smsapp/school-management-system/client/build;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/school-management-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Set up automatic renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Logging

### 1. Log Management

```bash
# Install logrotate configuration
sudo nano /etc/logrotate.d/school-management-system
```

```
/home/smsapp/school-management-system/server/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 smsapp smsapp
    postrotate
        pm2 reload school-management-system
    endscript
}
```

### 2. System Monitoring

Install monitoring tools:

```bash
# Install htop and iotop for system monitoring
sudo apt install htop iotop nethogs

# Set up simple monitoring script
cat > ~/monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring script

LOG_FILE="/home/smsapp/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if application is running
if ! pm2 list | grep -q "school-management-system.*online"; then
    echo "$DATE - Application is down, restarting..." >> $LOG_FILE
    pm2 restart school-management-system
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$DATE - Disk usage is at ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.2f%%", $3*100/$2 }')
echo "$DATE - Memory usage: $MEM_USAGE" >> $LOG_FILE
EOF

chmod +x ~/monitor.sh

# Add to crontab (check every 5 minutes)
crontab -e
# Add: */5 * * * * /home/smsapp/monitor.sh
```

## Performance Optimization

### 1. Database Optimization

```bash
# Install MySQL tuner
wget http://mysqltuner.pl/ -O mysqltuner.pl
chmod +x mysqltuner.pl
./mysqltuner.pl
```

### 2. Node.js Optimization

Add these optimizations to your PM2 configuration:

```javascript
module.exports = {
  apps: [{
    name: 'school-management-system',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      UV_THREADPOOL_SIZE: 128
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3. Caching Configuration

Consider implementing Redis for caching:

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Uncomment: maxmemory 256mb
# Uncomment: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

## Backup and Recovery

### 1. Automated Backup Script

```bash
cat > ~/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/smsapp/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/$DATE"

mkdir -p $BACKUP_PATH

# Backup database
mysqldump -u sms_user -p'your_password' school_management_system > $BACKUP_PATH/database.sql

# Backup uploads
cp -r /home/smsapp/school-management-system/server/uploads $BACKUP_PATH/

# Create archive
cd $BACKUP_DIR
tar -czf "${DATE}.tar.gz" $DATE
rm -rf $DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${DATE}.tar.gz"
EOF

chmod +x ~/backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/smsapp/backup.sh
```

### 2. Recovery Procedures

```bash
# Database recovery
mysql -u sms_user -p school_management_system < backup_file.sql

# File recovery
tar -xzf backup_date.tar.gz
cp -r backup_date/uploads/* /path/to/uploads/
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   pm2 logs school-management-system
   
   # Check if port is in use
   sudo netstat -tulpn | grep :5000
   ```

2. **Database connection issues**
   ```bash
   # Test database connection
   mysql -u sms_user -p -h localhost school_management_system
   
   # Check MySQL status
   sudo systemctl status mysql
   ```

3. **High memory usage**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Restart application
   pm2 restart school-management-system
   ```

4. **SSL certificate issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew --dry-run
   ```

### Health Checks

Create a health check endpoint monitoring script:

```bash
cat > ~/health-check.sh << 'EOF'
#!/bin/bash

URL="https://yourdomain.com/health"
WEBHOOK_URL="your_slack_webhook_url"

if ! curl -f -s $URL > /dev/null; then
    # Send alert
    curl -X POST "$WEBHOOK_URL" \
         -H 'Content-Type: application/json' \
         -d '{"text":"🚨 School Management System is down!"}'
    
    # Restart application
    pm2 restart school-management-system
fi
EOF

chmod +x ~/health-check.sh

# Run every 2 minutes
crontab -e
# Add: */2 * * * * /home/smsapp/health-check.sh
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review application logs
   - Check disk space
   - Monitor performance metrics

2. **Monthly**:
   - Update system packages
   - Review security logs
   - Optimize database

3. **Quarterly**:
   - Update Node.js version
   - Review and rotate API keys
   - Security audit

## Support

For additional support:

- Check the application logs in `logs/` directory
- Review system logs: `sudo journalctl -u nginx`, `sudo journalctl -u mysql`
- Monitor PM2 processes: `pm2 monit`

## Security Considerations

- Regularly update all software components
- Monitor failed login attempts
- Use strong, unique passwords
- Enable two-factor authentication where possible
- Regular security audits and penetration testing
- Keep backups secure and test recovery procedures
