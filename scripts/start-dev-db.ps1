# PowerShell script to start development database containers
Write-Host "Starting PostgreSQL and Redis containers for development..." -ForegroundColor Green

# Navigate to the project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

# Start the containers using docker-compose
docker-compose -f "$projectRoot\docker-compose.yml" up -d

# Check the status of containers
Start-Sleep -Seconds 2
Write-Host "Container status:" -ForegroundColor Cyan
docker ps --filter "name=innosecportal"

Write-Host "`nDatabases are ready for use." -ForegroundColor Green
Write-Host "PostgreSQL: localhost:5432 (User: postgres, Password: postgres, Database: innosecportal)" -ForegroundColor Yellow
Write-Host "Redis: localhost:6379" -ForegroundColor Yellow 