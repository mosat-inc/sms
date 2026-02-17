#!/bin/bash

# School Management System - Production Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="school-management-system"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/${TIMESTAMP}"

echo "🚀 Starting deployment for ${PROJECT_NAME} - Environment: ${ENVIRONMENT}"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed. Aborting."; exit 1; }
    command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed. Aborting."; exit 1; }
    command -v mysql >/dev/null 2>&1 || { print_warning "MySQL client not found. Database operations may fail."; }
    
    print_success "Dependencies check completed"
}

# Create backup before deployment
create_backup() {
    print_status "Creating backup..."
    
    mkdir -p ${BACKUP_DIR}
    
    # Backup current files
    if [ -d "uploads" ]; then
        cp -r uploads ${BACKUP_DIR}/
        print_success "Files backed up to ${BACKUP_DIR}"
    fi
    
    # Backup database (if possible)
    if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_NAME" ]; then
        mysqldump -h${DB_HOST} -u${DB_USER} -p${DB_PASS} ${DB_NAME} > ${BACKUP_DIR}/database.sql 2>/dev/null || print_warning "Database backup failed"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install server dependencies
    npm ci --only=production
    print_success "Server dependencies installed"
    
    # Install frontend dependencies (if exists)
    if [ -d "../client" ]; then
        cd ../client
        npm ci --only=production
        npm run build
        cd ../server
        print_success "Client built successfully"
    fi
}

# Set up environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.${ENVIRONMENT}" ]; then
            cp .env.${ENVIRONMENT} .env
            print_success "Environment file copied from .env.${ENVIRONMENT}"
        else
            print_warning "No environment file found. Please create .env manually."
        fi
    fi
    
    # Set production environment
    export NODE_ENV=${ENVIRONMENT}
    
    # Create necessary directories
    mkdir -p uploads/{materials,documents,images,temp}
    mkdir -p logs
    mkdir -p backups
    
    # Set proper permissions
    chmod 755 uploads
    chmod 755 logs
    chmod 755 backups
    
    print_success "Environment setup completed"
}

# Database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Run the database initialization
    node -e "
        const { initializeDatabase } = require('./config/database');
        initializeDatabase()
            .then(() => console.log('Database initialized successfully'))
            .catch(err => {
                console.error('Database initialization failed:', err.message);
                process.exit(1);
            });
    " || {
        print_error "Database migration failed"
        exit 1
    }
    
    print_success "Database migrations completed"
}

# Health check
health_check() {
    print_status "Running health check..."
    
    # Start server in background for testing
    NODE_ENV=${ENVIRONMENT} node server.js &
    SERVER_PID=$!
    
    sleep 5
    
    # Check if server is responding
    if curl -f http://localhost:${PORT:-5000}/health >/dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
}

# Setup systemd service (Linux only)
setup_systemd_service() {
    if [ "$OSTYPE" = "linux-gnu" ] && command -v systemctl >/dev/null 2>&1; then
        print_status "Setting up systemd service..."
        
        cat > /tmp/${PROJECT_NAME}.service << EOF
[Unit]
Description=School Management System
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=$(pwd)
Environment=NODE_ENV=${ENVIRONMENT}
Environment=PORT=${PORT:-5000}
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog

[Install]
WantedBy=multi-user.target
EOF
        
        sudo mv /tmp/${PROJECT_NAME}.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable ${PROJECT_NAME}
        
        print_success "Systemd service configured"
    fi
}

# Setup log rotation
setup_log_rotation() {
    if command -v logrotate >/dev/null 2>&1; then
        print_status "Setting up log rotation..."
        
        cat > /tmp/${PROJECT_NAME} << EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
    postrotate
        systemctl reload ${PROJECT_NAME} || true
    endscript
}
EOF
        
        sudo mv /tmp/${PROJECT_NAME} /etc/logrotate.d/
        print_success "Log rotation configured"
    fi
}

# Setup monitoring (basic)
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Create simple monitoring script
    cat > monitor.sh << 'EOF'
#!/bin/bash
SERVICE_NAME="school-management-system"
URL="http://localhost:${PORT:-5000}/health"

if ! curl -f $URL >/dev/null 2>&1; then
    echo "Service is down, restarting..."
    systemctl restart $SERVICE_NAME
    
    # Send notification (if webhook is configured)
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 School Management System service restarted on $(hostname)\"}" \
            >/dev/null 2>&1
    fi
fi
EOF
    
    chmod +x monitor.sh
    
    # Add to crontab (check every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * $(pwd)/monitor.sh") | crontab -
    
    print_success "Basic monitoring configured"
}

# Main deployment function
main() {
    print_status "Starting deployment process..."
    
    check_dependencies
    create_backup
    setup_environment
    install_dependencies
    run_migrations
    health_check
    
    if [ "${ENVIRONMENT}" = "production" ]; then
        setup_systemd_service
        setup_log_rotation
        setup_monitoring
    fi
    
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "  Environment: ${ENVIRONMENT}"
    echo "  Backup: ${BACKUP_DIR}"
    echo "  Port: ${PORT:-5000}"
    echo "  Logs: $(pwd)/logs/"
    echo ""
    echo "🔧 Next Steps:"
    echo "  1. Configure your web server (nginx/apache) to proxy to port ${PORT:-5000}"
    echo "  2. Set up SSL certificates"
    echo "  3. Configure your domain DNS"
    echo "  4. Monitor the logs for any issues"
    echo ""
    
    if [ "${ENVIRONMENT}" = "production" ]; then
        echo "🚀 To start the service:"
        echo "  sudo systemctl start ${PROJECT_NAME}"
        echo "  sudo systemctl status ${PROJECT_NAME}"
    else
        echo "🚀 To start the server:"
        echo "  NODE_ENV=${ENVIRONMENT} node server.js"
    fi
}

# Run main function
main "$@"
