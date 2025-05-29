#!/bin/bash
# Deployment script for Bonus Management System Backend
# This script handles the build and deployment of the backend application

set -e  # Exit immediately if a command exits with a non-zero status

# Configuration
APP_NAME="bonus-management-backend"
DEPLOY_DIR="/opt/bonus-management/backend"
LOG_DIR="/var/log/bonus-app"
NODE_VERSION="16.x"
PM2_INSTANCES=2

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}=== Bonus Management Backend Deployment ===${NC}"
echo "Starting deployment at $(date)"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Create directories if they don't exist
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p $DEPLOY_DIR
mkdir -p $LOG_DIR
chmod 755 $DEPLOY_DIR
chmod 755 $LOG_DIR

# Backup existing deployment if it exists
if [ -d "$DEPLOY_DIR/current" ]; then
  BACKUP_DIR="$DEPLOY_DIR/backup_$(date +%Y%m%d_%H%M%S)"
  echo -e "${YELLOW}Backing up existing deployment to $BACKUP_DIR${NC}"
  mv $DEPLOY_DIR/current $BACKUP_DIR
fi

# Create new deployment directory
RELEASE_DIR="$DEPLOY_DIR/release_$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}Creating new deployment directory: $RELEASE_DIR${NC}"
mkdir -p $RELEASE_DIR

# Copy application files
echo -e "${YELLOW}Copying application files...${NC}"
cp -R /home/ubuntu/bonus_app_backend/* $RELEASE_DIR/

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd $RELEASE_DIR
npm ci --production

# Copy production configuration
echo -e "${YELLOW}Setting up production configuration...${NC}"
cp production.config.js config.js

# Load environment variables
if [ -f "/opt/bonus-management/env/.env.backend" ]; then
  echo -e "${YELLOW}Loading environment variables...${NC}"
  set -a
  source /opt/bonus-management/env/.env.backend
  set +a
else
  echo -e "${RED}Warning: Environment file not found. Using default environment variables.${NC}"
fi

# Create symlink to current release
echo -e "${YELLOW}Creating symlink to current release...${NC}"
ln -sfn $RELEASE_DIR $DEPLOY_DIR/current

# Set up PM2 configuration
echo -e "${YELLOW}Setting up PM2 configuration...${NC}"
cat > $DEPLOY_DIR/current/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: "${APP_NAME}",
    script: "src/server.js",
    instances: ${PM2_INSTANCES},
    exec_mode: "cluster",
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "${LOG_DIR}/error.log",
    out_file: "${LOG_DIR}/out.log",
    merge_logs: true
  }]
};
EOF

# Check if PM2 is installed, install if not
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}Installing PM2...${NC}"
  npm install -g pm2
fi

# Start or restart the application
echo -e "${YELLOW}Starting application with PM2...${NC}"
cd $DEPLOY_DIR/current
if pm2 list | grep -q "$APP_NAME"; then
  pm2 reload ecosystem.config.js
else
  pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
echo -e "${YELLOW}Setting up PM2 to start on system boot...${NC}"
pm2 startup | tail -n 1 > /tmp/pm2_startup_command.sh
chmod +x /tmp/pm2_startup_command.sh
/tmp/pm2_startup_command.sh
rm /tmp/pm2_startup_command.sh

# Clean up old deployments (keep last 5)
echo -e "${YELLOW}Cleaning up old deployments...${NC}"
cd $DEPLOY_DIR
ls -dt release_* | tail -n +6 | xargs -r rm -rf
ls -dt backup_* | tail -n +6 | xargs -r rm -rf

# Print success message
echo -e "${GREEN}Deployment completed successfully at $(date)${NC}"
echo -e "${GREEN}Application is running at http://localhost:${PORT:-3000}${NC}"
echo -e "${GREEN}Logs are available at ${LOG_DIR}${NC}"

# Print PM2 status
echo -e "${YELLOW}Current PM2 status:${NC}"
pm2 list

exit 0
