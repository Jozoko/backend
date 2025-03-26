#!/bin/bash
# Bash script to stop development database containers

echo -e "\033[0;32mStopping PostgreSQL and Redis containers...\033[0m"

# Navigate to the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Stop the containers using docker-compose
docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down

echo -e "\n\033[0;32mDatabase containers have been stopped.\033[0m" 