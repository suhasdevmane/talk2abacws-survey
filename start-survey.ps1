# Quick Start Script for User Survey Framework
# Run this script to set up and start the survey system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "User Survey Framework - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Install API dependencies
Write-Host ""
Write-Host "Installing API dependencies..." -ForegroundColor Yellow
Push-Location api
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ API dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install API dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} else {
    Write-Host "✗ API package.json not found" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Install Frontend dependencies
Write-Host ""
Write-Host "Installing Frontend dependencies..." -ForegroundColor Yellow
Push-Location rasa-frontend
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install Frontend dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} else {
    Write-Host "✗ Frontend package.json not found" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Start Docker Compose services
Write-Host ""
Write-Host "Starting Docker services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker services started" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start Docker services" -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host ""
Write-Host "Checking service health..." -ForegroundColor Yellow

# Check MongoDB
$mongoStatus = docker ps --filter "name=abacws-mongo" --filter "status=running" --format "{{.Status}}"
if ($mongoStatus) {
    Write-Host "✓ MongoDB: Running" -ForegroundColor Green
} else {
    Write-Host "✗ MongoDB: Not running" -ForegroundColor Red
}

# Check API
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5
    if ($apiResponse.StatusCode -eq 200) {
        Write-Host "✓ API Service: Running on http://localhost:5000" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ API Service: Not responding" -ForegroundColor Red
}

# Check Visualizer
try {
    $vizResponse = Invoke-WebRequest -Uri "http://localhost:8090" -UseBasicParsing -TimeoutSec 5
    if ($vizResponse.StatusCode -eq 200) {
        Write-Host "✓ Visualizer: Running on http://localhost:8090" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Visualizer: Not responding" -ForegroundColor Red
}

# Check Frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✓ Frontend: Running on http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Frontend: Starting up (may take a few moments)" -ForegroundColor Yellow
}

# Display access information
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access the application:" -ForegroundColor Yellow
Write-Host "  Frontend:   http://localhost:3000" -ForegroundColor White
Write-Host "  API:        http://localhost:5000" -ForegroundColor White
Write-Host "  Visualizer: http://localhost:8090" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "  2. Create an account (username + password)" -ForegroundColor White
Write-Host "  3. Click 'Start Survey' button" -ForegroundColor White
Write-Host "  4. Explore the visualizer and ask questions!" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "  docker-compose down" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed documentation, see SURVEY_SETUP.md" -ForegroundColor Cyan
Write-Host ""
