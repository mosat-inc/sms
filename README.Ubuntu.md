# UBUNIFU SEC SMS - Ubuntu Deployment Guide

Complete guide for deploying the UBUNIFU SEC School Management System on Ubuntu Linux.

## 🐧 Ubuntu Requirements

### Supported Ubuntu Versions
- Ubuntu 20.04 LTS (Focal Fossa)
- Ubuntu 22.04 LTS (Jammy Jellyfish)
- Ubuntu 18.04 LTS (Bionic Beaver)

### System Requirements
- **RAM**: Minimum 4GB, Recommended 8GB
- **Storage**: Minimum 10GB free space
- **CPU**: Any modern x86_64 processor
- **Network**: Internet connection for initial setup

## 🔧 Prerequisites Installation

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Docker
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install required packages
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io
```

### 3. Install Docker Compose
```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4. Configure Docker (Recommended)
```bash
# Add user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Enable Docker to start on boot
sudo systemctl enable docker

# Start Docker service
sudo systemctl start docker

# Logout and login again for group changes to take effect
# Or run: newgrp docker
```

## 📦 Deploy UBUNIFU SEC SMS

### Method 1: Using Setup Scripts (Recommended)

1. **Extract Project**
```bash
# Assuming you have sms.zip
unzip sms.zip
cd sms

# Make scripts executable
chmod +x scripts/*.sh
```

2. **Development Deployment**
```bash
./scripts/dev.sh
```

3. **Production Deployment**
```bash
./scripts/deploy.sh
```

### Method 2: Manual Deployment

1. **Setup Environment**
```bash
cd sms
cp .env.example .env
nano .env  # Edit configuration
```

2. **Start Services**
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose up -d
```

## 🌐 Access Application

After deployment, access the application at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Database**: localhost:3306

### Default Credentials
- **Admin**: admin / admin123
- **Teacher**: mohamedi.shango / teacher123

## 🔥 Firewall Configuration (For Server Deployment)

If deploying on a server for network access:

```bash
# Install UFW (if not installed)
sudo apt install ufw

# Allow SSH (important!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application ports
sudo ufw allow 3000  # Frontend
sudo ufw allow 5000  # Backend

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 📊 System Monitoring

### Check Service Status
```bash
# Docker service
sudo systemctl status docker

# Container status
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resources
docker stats
```

### System Resources
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
htop  # or top
```

## 🔧 Common Ubuntu-Specific Issues

### Issue 1: Docker Permission Denied
```bash
# Solution: Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### Issue 2: Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000

# Stop conflicting service
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if Nginx is running
```

### Issue 3: Docker Compose Command Not Found
```bash
# Install using apt (alternative method)
sudo apt install docker-compose

# Or create symlink if installed manually
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
```

### Issue 4: Database Connection Issues
```bash
# Check if MySQL port is blocked
sudo netstat -tulpn | grep :3306

# Check Docker logs
docker-compose logs db

# Restart database container
docker-compose restart db
```

## 🚀 Production Server Setup

### 1. Domain and SSL Setup
```bash
# Install Certbot for Let's Encrypt SSL
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure reverse proxy with Nginx
sudo apt install nginx
```

### 2. Nginx Configuration
Create `/etc/nginx/sites-available/sms`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/sms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔄 Backup and Maintenance

### Database Backup
```bash
# Create backup
docker-compose exec db mysqldump -u root -p sms_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T db mysql -u root -p sms_database < backup.sql
```

### Update Application
```bash
# Pull latest changes (if using git)
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker
sudo apt update && sudo apt install docker-ce docker-ce-cli containerd.io

# Clean up Docker
docker system prune -f
```

## 📈 Performance Optimization

### 1. System Limits
```bash
# Increase open file limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### 2. Docker Optimization
```bash
# Optimize Docker daemon
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

### 3. Database Optimization
Edit `.env`:
```bash
# Add MySQL optimization
MYSQL_INNODB_BUFFER_POOL_SIZE=256M
MYSQL_MAX_CONNECTIONS=100
```

## 🆘 Troubleshooting Commands

```bash
# Check all services
./scripts/dev.sh --help

# View detailed logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Restart specific service
docker-compose restart backend

# Rebuild everything
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check system resources
docker stats
df -h
free -m
```

## 📞 Support

For Ubuntu-specific issues:
1. Check Docker installation: `docker --version`
2. Check Docker Compose: `docker-compose --version`
3. Verify Docker service: `sudo systemctl status docker`
4. Check logs: `docker-compose logs -f`
5. Restart services: `docker-compose restart`

---

**🎉 Your UBUNIFU SEC SMS is now running perfectly on Ubuntu Linux!**
