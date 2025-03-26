#!/bin/bash
# Bash script to start development database containers

echo -e "\033[0;32mStarting PostgreSQL and Redis containers for development...\033[0m"

# Navigate to the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Start the containers using docker-compose
docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d

# Check the status of containers
sleep 2
echo -e "\033[0;36mContainer status:\033[0m"
docker ps --filter "name=innosecportal"

echo -e "\n\033[0;32mDatabases are ready for use.\033[0m"
echo -e "\033[0;33mPostgreSQL: localhost:5432 (User: postgres, Password: postgres, Database: innosecportal)\033[0m"
echo -e "\033[0;33mRedis: localhost:6379\033[0m" 