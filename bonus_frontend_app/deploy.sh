#!/bin/bash
# Deployment script for Bonus Management System Frontend
# This script handles the build and deployment of the frontend application

set -e  # Exit immediately if a command exits with a non-zero status

# Configuration
APP_NAME="bonus-management-frontend"
DEPLOY_DIR="/opt/bonus-management/frontend"
BUILD_DIR="/home/ubuntu/bonus_frontend_app/dist"
NGINX_CONF_DIR="/etc/nginx/conf.d"
NODE_VERSION="16.x"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}=== Bonus Management Frontend Deployment ===${NC}"
echo "Starting deployment at $(date)"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Create directories if they don't exist
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p $DEPLOY_DIR
chmod 755 $DEPLOY_DIR

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

# Build the application
echo -e "${YELLOW}Building the application...${NC}"
cd /home/ubuntu/bonus_frontend_app

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Installing Node.js ${NODE_VERSION}...${NC}"
  curl -sL https://deb.nodesource.com/setup_${NODE_VERSION} | bash -
  apt-get install -y nodejs
fi

# Install dependencies and build
npm ci
npm run build -- --prod

# Copy build files to release directory
echo -e "${YELLOW}Copying build files to release directory...${NC}"
cp -R $BUILD_DIR/* $RELEASE_DIR/

# Create symlink to current release
echo -e "${YELLOW}Creating symlink to current release...${NC}"
ln -sfn $RELEASE_DIR $DEPLOY_DIR/current

# Set up Nginx configuration
echo -e "${YELLOW}Setting up Nginx configuration...${NC}"
cat > $NGINX_CONF_DIR/bonus-management.conf << EOF
server {
    listen 80;
    server_name bonus.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name bonus.example.com;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/bonus.example.com.crt;
    ssl_certificate_key /etc/ssl/private/bonus.example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    
    # Root directory
    root $DEPLOY_DIR/current;
    
    # Gzip settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache settings for static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Main rule for SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Check if Nginx is installed, install if not
if ! command -v nginx &> /dev/null; then
  echo -e "${YELLOW}Installing Nginx...${NC}"
  apt-get update
  apt-get install -y nginx
fi

# Test Nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
nginx -t

# Reload Nginx to apply changes
echo -e "${YELLOW}Reloading Nginx...${NC}"
systemctl reload nginx

# Clean up old deployments (keep last 5)
echo -e "${YELLOW}Cleaning up old deployments...${NC}"
cd $DEPLOY_DIR
ls -dt release_* | tail -n +6 | xargs -r rm -rf
ls -dt backup_* | tail -n +6 | xargs -r rm -rf

# Print success message
echo -e "${GREEN}Deployment completed successfully at $(date)${NC}"
echo -e "${GREEN}Application is available at https://bonus.example.com${NC}"

exit 0
