#!/bin/bash
# UBUNIFU SEC SMS - Production Deployment Script
# Bash script for Ubuntu/Linux production deployment

set -e  # Exit on any error

# Default parameters
FORCE=false
BUILD=true
MIGRATE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --no-build)
            BUILD=false
            shift
            ;;
        --no-migrate)
            MIGRATE=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--force] [--no-build] [--no-migrate]"
            echo "  --force      Stop existing containers and clean up"
            echo "  --no-build   Skip building containers"
            echo "  --no-migrate Skip database migration"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🚀 Deploying UBUNIFU SEC SMS to Production...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker service.${NC}"
    echo "Start Docker: sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check for required files
required_files=(".env" "docker-compose.yml")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        if [ "$file" = ".env" ]; then
            echo -e "${YELLOW}📝 Creating .env file from .env.example...${NC}"
            cp .env.example .env
            echo -e "${YELLOW}⚠️  Please update .env file with your production configuration!${NC}"
            echo -e "${YELLOW}Press any key to continue after updating .env...${NC}"
            read -n 1 -s
        else
            echo -e "${RED}❌ Required file missing: $file${NC}"
            exit 1
        fi
    fi
done

echo -e "${GREEN}✅ All required files present${NC}"

# Stop existing containers if force flag is set
if [ "$FORCE" = true ]; then
    echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
    docker-compose down --remove-orphans || true
    docker system prune -f --volumes || true
fi

# Build containers if build flag is set
if [ "$BUILD" = true ]; then
    echo -e "${BLUE}🔨 Building production containers...${NC}"
    docker-compose build --no-cache --parallel
fi

# Start services
echo -e "${BLUE}🚀 Starting production services...${NC}"
docker-compose up -d

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    sleep 5
    
    if docker-compose exec -T db mysqladmin ping -h localhost -u root -prootpassword 2>/dev/null; then
        echo -e "${GREEN}✅ Database is ready${NC}"
        break
    fi
    
    echo -e "${YELLOW}⏳ Attempt $attempt/$max_attempts - Database not ready yet...${NC}"
done

if [ $attempt -ge $max_attempts ]; then
    echo -e "${RED}❌ Database failed to start after $max_attempts attempts${NC}"
    exit 1
fi

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
max_attempts=20
attempt=0
while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    sleep 10
    
    if curl -f http://localhost:5000/api/health 2>/dev/null; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
        break
    fi
    
    echo -e "${YELLOW}⏳ Attempt $attempt/$max_attempts - Backend not ready yet...${NC}"
done

if [ $attempt -ge $max_attempts ]; then
    echo -e "${RED}❌ Backend failed to start after $max_attempts attempts${NC}"
    echo -e "${YELLOW}📋 Backend logs:${NC}"
    docker-compose logs backend
    exit 1
fi

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"
docker-compose ps

# Show deployment information
echo -e "${GREEN}✅ Production deployment completed!${NC}"
echo -e "${CYAN}🌐 Application URLs:${NC}"
echo -e "${WHITE}Frontend:             http://localhost:3000${NC}"
echo -e "${WHITE}Backend API:          http://localhost:5000${NC}"
echo -e "${WHITE}Database:             localhost:3306${NC}"

echo -e "${CYAN}🔐 Admin Credentials:${NC}"
echo -e "${WHITE}Username:             admin${NC}"
echo -e "${WHITE}Password:             admin123${NC}"

echo -e "${CYAN}📝 Management Commands:${NC}"
echo -e "${WHITE}View logs:            docker-compose logs -f${NC}"
echo -e "${WHITE}Stop services:        docker-compose down${NC}"
echo -e "${WHITE}Restart service:      docker-compose restart <service_name>${NC}"
echo -e "${WHITE}Update deployment:    ./scripts/deploy.sh --force${NC}"

echo -e "${GREEN}🎉 UBUNIFU SEC SMS is now running in production mode!${NC}"
