# UBUNIFU SEC SMS - Production Deployment Script
# PowerShell script for Windows production deployment

param(
    [switch]$Force = $false,
    [switch]$Build = $true,
    [switch]$Migrate = $true
)

Write-Host "🚀 Deploying UBUNIFU SEC SMS to Production..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Check for required files
$requiredFiles = @(".env", "docker-compose.yml")
foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Host "❌ Required file missing: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ All required files present" -ForegroundColor Green

# Stop existing containers if force flag is set
if ($Force) {
    Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
    docker-compose down --remove-orphans
    docker system prune -f --volumes
}

# Build containers if build flag is set
if ($Build) {
    Write-Host "🔨 Building production containers..." -ForegroundColor Blue
    docker-compose build --no-cache --parallel
}

# Start services
Write-Host "🚀 Starting production services..." -ForegroundColor Blue
docker-compose up -d

# Wait for database to be ready
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    Start-Sleep -Seconds 5
    $dbReady = docker-compose exec -T db mysqladmin ping -h localhost -u root -prootpassword 2>$null
    if ($dbReady) {
        Write-Host "✅ Database is ready" -ForegroundColor Green
        break
    }
    Write-Host "⏳ Attempt $attempt/$maxAttempts - Database not ready yet..." -ForegroundColor Yellow
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "❌ Database failed to start after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

# Wait for backend to be ready
Write-Host "⏳ Waiting for backend to be ready..." -ForegroundColor Yellow
$maxAttempts = 20
$attempt = 0
do {
    $attempt++
    Start-Sleep -Seconds 10
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend is ready" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "⏳ Attempt $attempt/$maxAttempts - Backend not ready yet..." -ForegroundColor Yellow
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "❌ Backend failed to start after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "📋 Backend logs:" -ForegroundColor Yellow
    docker-compose logs backend
    exit 1
}

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Blue
docker-compose ps

# Show deployment information
Write-Host "`n✅ Production deployment completed!" -ForegroundColor Green
Write-Host "`n🌐 Application URLs:" -ForegroundColor Cyan
Write-Host "Frontend:             http://localhost:3000" -ForegroundColor White
Write-Host "Backend API:          http://localhost:5000" -ForegroundColor White
Write-Host "Database:             localhost:3306" -ForegroundColor White

Write-Host "`n🔐 Admin Credentials:" -ForegroundColor Cyan
Write-Host "Username:             admin" -ForegroundColor White
Write-Host "Password:             admin123" -ForegroundColor White

Write-Host "`n📝 Management Commands:" -ForegroundColor Cyan
Write-Host "View logs:            docker-compose logs -f" -ForegroundColor White
Write-Host "Stop services:        docker-compose down" -ForegroundColor White
Write-Host "Restart service:      docker-compose restart <service_name>" -ForegroundColor White
Write-Host "Update deployment:    .\scripts\deploy.ps1 -Force" -ForegroundColor White

Write-Host "`n🎉 UBUNIFU SEC SMS is now running in production mode!" -ForegroundColor Green
