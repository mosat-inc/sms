#!/bin/bash
# UBUNIFU SEC SMS - Development Environment Startup Script
# Bash script for Ubuntu/Linux development

set -e  # Exit on any error

echo "🚀 Starting UBUNIFU SEC SMS Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Install Docker: https://docs.docker.com/engine/install/ubuntu/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker service.${NC}"
    echo "Start Docker: sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if user is in docker group
if ! groups | grep -q docker; then
    echo -e "${YELLOW}⚠️  User is not in docker group. You may need to use sudo or add user to docker group:${NC}"
    echo "sudo usermod -aG docker \$USER"
    echo "Then logout and login again."
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env file with your configuration!${NC}"
fi

# Build and start development containers
echo -e "${BLUE}🔨 Building and starting development containers...${NC}"
docker-compose -f docker-compose.dev.yml down --remove-orphans
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check service status
echo -e "${CYAN}📊 Service Status:${NC}"
docker-compose -f docker-compose.dev.yml ps

# Show useful information
echo -e "${GREEN}🌐 Application URLs:${NC}"
echo -e "${WHITE}Frontend (React):     http://localhost:3000${NC}"
echo -e "${WHITE}Backend API:          http://localhost:5000${NC}"
echo -e "${WHITE}Database (MySQL):     localhost:3306${NC}"

echo -e "${GREEN}🔐 Default Credentials:${NC}"
echo -e "${WHITE}Admin Username:       admin${NC}"
echo -e "${WHITE}Admin Password:       admin123${NC}"
echo -e "${WHITE}Teacher Username:     mohamedi.shango${NC}"
echo -e "${WHITE}Teacher Password:     teacher123${NC}"

echo -e "${CYAN}📝 Useful Commands:${NC}"
echo -e "${WHITE}View logs:            docker-compose -f docker-compose.dev.yml logs -f${NC}"
echo -e "${WHITE}Stop services:        docker-compose -f docker-compose.dev.yml down${NC}"
echo -e "${WHITE}Rebuild services:     docker-compose -f docker-compose.dev.yml build --no-cache${NC}"

echo -e "${GREEN}✅ Development environment is ready!${NC}"
