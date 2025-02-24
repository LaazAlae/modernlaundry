#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting deployment of Flint Laundry Status PWA...${NC}"

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p mongodb_data
mkdir -p backend/src
mkdir -p frontend/public

# Initialize backend if needed
if [ ! -f backend/package.json ]; then
    echo -e "${YELLOW}Initializing backend...${NC}"
    cd backend
    npm init -y
    npm install express mongoose cors nodemailer dotenv
    cd ..
fi

# Set up environment variables
echo -e "${YELLOW}Setting up environment variables...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Please update the .env file with your configurations"
fi

# Build and start containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check if containers are running
echo -e "${YELLOW}Checking container status...${NC}"
docker-compose ps

# Set up backup cron job
echo -e "${YELLOW}Setting up daily backup...${NC}"
(crontab -l 2>/dev/null; echo "0 0 * * * docker exec mongodb mongodump --out /backup") | crontab -

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "You can access the application at: http://localhost"
echo -e "To view logs, run: docker-compose logs -f"