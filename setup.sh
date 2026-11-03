#!/bin/bash

# ANSI color codes for better visibility in terminal output
RED='\033[0;31m'     # Red for errors
GREEN='\033[0;32m'   # Green for success messages
YELLOW='\033[0;33m'  # Yellow for warnings or process info
NC='\033[0m'         # Reset color

# Display a banner
display_banner() {
    echo -e "${GREEN}"
    echo -e "############################################################"
    echo -e "#                                                          #"
    echo -e "#                       SITMUN setup                       #"
    echo -e "#                                                          #"
    echo -e "############################################################"
    echo -e "${NC}"
}


# Check if the current directory is a Git repository
check_git_repository() {
    echo -e "${YELLOW}Checking if the current directory is a Git repository...${NC}"
    if [ ! -d ".git" ]; then
        echo -e "${RED}Error: The current directory is not a Git repository.${NC}"
        exit 1
    fi
}

append_compose_secret_if_missing() {
    local key="$1"
    if ! grep -q "^${key}=" .env; then
        echo "${key}=$(openssl rand -hex 32)" >> .env
    fi
}

# Copy default development profile to .env if .env does not exist.
# Profile files do not store secrets. Generate any of the three that are absent.
copy_env_file_if_missing() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}.env file is missing. Copying profiles/development-postgres.env to .env...${NC}"
        cp profiles/development-postgres.env .env
        append_compose_secret_if_missing SITMUN_USER_SECRET
        append_compose_secret_if_missing MIDDLEWARE_SECRET
        append_compose_secret_if_missing SITMUN_MBTILES_JOB_HANDLE_SECRET
        echo -e "${GREEN}.env file created from profiles/development-postgres.env.${NC}"
    fi
}

# Main logic
display_banner
check_git_repository
copy_env_file_if_missing
