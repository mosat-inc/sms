# UBUNIFU SEC SMS - Docker Deployment Guide

Complete containerization setup for the UBUNIFU SEC School Management System with Docker, Docker Compose, and production-ready configurations.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React +      │◄───┤   (Node.js +    │◄───┤   (MySQL 8.0)   │
│    Nginx)       │    │    Express)     │    │                 │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Container Structure

### Frontend Container
- **Base Image**: `nginx:1.25-alpine`
- **Build**: Multi-stage React build served by Nginx
- **Port**: 3000 → 80
- **Features**: SPA routing, API proxy, gzip compression, security headers

### Backend Container  
- **Base Image**: `node:18-alpine`
- **Build**: Multi-stage production build
- **Port**: 5000
- **Features**: Health checks, non-root user, proper signal handling

### Database Container
- **Base Image**: `mysql:8.0`
- **Port**: 3306
- **Features**: Persistent volumes, automatic schema initialization, health checks

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v3.9+
- At least 4GB RAM available for containers

### Development Environment

1. **Clone and Setup**
```bash
git clone <repository-url>
cd sms
```

2. **Create Environment File**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Development Environment**
```bash
# Windows PowerShell
.\scripts\dev.ps1

# Or manually with Docker Compose
docker-compose -f docker-compose.dev.yml up -d
```

4. **Access Applications**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Database: localhost:3306

### Production Deployment

1. **Prepare Environment**
```bash
cp .env.example .env
# Update .env with production values
```

2. **Deploy to Production**
```bash
# Windows PowerShell
.\scripts\deploy.ps1

# Or manually
docker-compose up -d
```

## 🔧 Configuration Files

### Docker Compose Files

| File | Purpose | Usage |
|------|---------|--------|
| `docker-compose.yml` | Production deployment | `docker-compose up -d` |
| `docker-compose.dev.yml` | Development environment | `docker-compose -f docker-compose.dev.yml up -d` |

### Environment Files

| File | Purpose | Usage |
|------|---------|--------|
| `.env.example` | Template configuration | Copy to `.env` and customize |
| `.env.production` | Production defaults | Reference for production setup |
| `.env` | Active configuration | Used by Docker Compose |

## 📊 Service Details

### Database Service
```yaml
Service Name: db
Container: sms-mysql
Image: mysql:8.0
Port: 3306
Volume: db_data:/var/lib/mysql
Health Check: mysqladmin ping
```

**Default Credentials:**
- Root Password: `rootpassword` (change in production)
- Database: `sms_database`
- User: `sms_user`
- Password: `sms_password` (change in production)

### Backend Service
```yaml
Service Name: backend
Container: sms-backend
Build: ./server/Dockerfile
Port: 5000
Dependencies: database
Health Check: /api/health
```

**Environment Variables:**
- `NODE_ENV`: production
- `DB_HOST`: db
- `JWT_SECRET`: (set in .env)

### Frontend Service
```yaml
Service Name: frontend
Container: sms-frontend
Build: ./client/Dockerfile
Port: 3000 (mapped to 80)
Dependencies: backend
```

## 🔍 Health Monitoring

### Health Check Endpoints
- **Health**: `GET /api/health` - Overall service health
- **Readiness**: `GET /api/health/ready` - Service ready to accept requests
- **Liveness**: `GET /api/health/live` - Service is alive

### Container Health Checks
All containers include built-in health checks that Docker monitors:
- Database: MySQL ping test
- Backend: HTTP health endpoint check
- Frontend: HTTP response check

## 📝 Management Commands

### Development Commands
```bash
# Start development environment
.\scripts\dev.ps1

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Rebuild services
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Production Commands
```bash
# Deploy to production
.\scripts\deploy.ps1

# Deploy with force rebuild
.\scripts\deploy.ps1 -Force

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart specific service
docker-compose restart backend
```

### Database Management
```bash
# Connect to database
docker-compose exec db mysql -u root -p sms_database

# Backup database
docker-compose exec db mysqldump -u root -p sms_database > backup.sql

# Restore database
docker-compose exec -T db mysql -u root -p sms_database < backup.sql

# View database logs
docker-compose logs db
```

## 🔐 Security Considerations

### Production Security Checklist
- [ ] Change default database passwords
- [ ] Set strong JWT secret
- [ ] Configure proper SSL/TLS termination
- [ ] Enable firewall rules
- [ ] Restrict database access
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

### Environment Security
```bash
# Generate strong passwords
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 16  # For database passwords
```

## 🚀 Deployment Strategies

### Local Development
- Hot reloading enabled
- Volume mounting for live code changes
- Debug ports exposed
- Development dependencies included

### Production Deployment
- Optimized multi-stage builds
- Minimal container sizes
- Non-root users
- Health checks enabled
- Log aggregation ready

### Scaling Options
```yaml
# Scale backend instances
docker-compose up -d --scale backend=3

# Load balancer configuration needed for multiple instances
```

## 📋 Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check database status
docker-compose ps db

# View database logs
docker-compose logs db

# Connect to database manually
docker-compose exec db mysql -u root -p
```

**Backend Not Starting**
```bash
# Check backend logs
docker-compose logs backend

# Restart backend service
docker-compose restart backend

# Rebuild backend container
docker-compose build --no-cache backend
```

**Frontend Build Failures**
```bash
# Check build logs
docker-compose logs frontend

# Rebuild frontend with verbose output
docker-compose build --no-cache --progress=plain frontend
```

### Log Analysis
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# View logs with timestamps
docker-compose logs -f -t

# View last N lines
docker-compose logs --tail=50 backend
```

## 🔄 Updates and Maintenance

### Updating the Application
1. Pull latest changes
2. Stop services: `docker-compose down`
3. Rebuild: `docker-compose build --no-cache`
4. Start: `docker-compose up -d`

### Database Migration
- Database schema updates are handled automatically
- Backup before major updates
- Test migrations in development first

### Container Updates
```bash
# Update base images
docker-compose pull

# Rebuild all containers
docker-compose build --no-cache

# Clean up old images
docker system prune -f
```

## 📊 Monitoring and Logs

### Log Locations
- Container logs: `docker-compose logs`
- Application logs: `/app/logs` (inside containers)
- Database logs: MySQL container logs

### Production Monitoring
Consider integrating with:
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization  
- **ELK Stack**: Log aggregation
- **Sentry**: Error tracking

## 🎯 Default Credentials

**Admin User**
- Username: `admin`
- Password: `admin123`
- Email: `admin@ubunifusec.com`

**Teacher User**
- Username: `mohamedi.shango`
- Password: `teacher123`
- Email: `mohamed@ubunifusec.com`

**⚠️ IMPORTANT**: Change these credentials immediately in production!

## 📞 Support

For deployment issues:
1. Check this documentation
2. Review container logs
3. Verify environment configuration
4. Check Docker and system resources

---

**🎉 Your UBUNIFU SEC SMS is now fully containerized and ready for deployment!**
