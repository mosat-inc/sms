# UBUNIFU SEC SMS - Development Environment Startup Script
# PowerShell script for Windows development

Write-Host "🚀 Starting UBUNIFU SEC SMS Development Environment..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please update .env file with your configuration!" -ForegroundColor Yellow
}

# Build and start development containers
Write-Host "🔨 Building and starting development containers..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml down --remove-orphans
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service status
Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml ps

# Show useful information
Write-Host "`n🌐 Application URLs:" -ForegroundColor Green
Write-Host "Frontend (React):     http://localhost:3000" -ForegroundColor White
Write-Host "Backend API:          http://localhost:5000" -ForegroundColor White
Write-Host "Database (MySQL):     localhost:3306" -ForegroundColor White

Write-Host "`n🔐 Default Credentials:" -ForegroundColor Green
Write-Host "Admin Username:       admin" -ForegroundColor White
Write-Host "Admin Password:       admin123" -ForegroundColor White
Write-Host "Teacher Username:     mohamedi.shango" -ForegroundColor White
Write-Host "Teacher Password:     teacher123" -ForegroundColor White

Write-Host "`n📝 Useful Commands:" -ForegroundColor Cyan
Write-Host "View logs:            docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor White
Write-Host "Stop services:        docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
Write-Host "Rebuild services:     docker-compose -f docker-compose.dev.yml build --no-cache" -ForegroundColor White

Write-Host "`n✅ Development environment is ready!" -ForegroundColor Green
