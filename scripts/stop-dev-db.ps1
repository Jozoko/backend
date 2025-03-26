# PowerShell script to stop development database containers
Write-Host "Stopping PostgreSQL and Redis containers..." -ForegroundColor Green

# Navigate to the project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

# Stop the containers using docker-compose
docker-compose -f "$projectRoot\docker-compose.yml" down

Write-Host "`nDatabase containers have been stopped." -ForegroundColor Green 