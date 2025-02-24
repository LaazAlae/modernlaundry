# Flint Laundry Status PWA

A Progressive Web App for tracking laundry machine availability in real-time.

## Free Deployment Guide

### Prerequisites
- A GitHub account
- An Oracle Cloud Free Tier account

### Step 1: Deploy on Oracle Cloud Free Tier

1. Sign up for Oracle Cloud Free Tier (https://www.oracle.com/cloud/free/)
2. Create a new VM instance:
   - Select "Always Free Eligible" options
   - Choose Oracle Linux
   - Use the smallest available shape (VM.Standard.E2.1.Micro)

3. SSH into your VM and install dependencies:
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER
```

### Step 2: Deploy the Application

1. Clone the repository to your VM:
```bash
git clone <your-repo-url>
cd laundry-pwa
```

2. Create necessary directories:
```bash
mkdir -p mongodb_data
```

3. Start the application:
```bash
docker-compose up -d
```

### Step 3: Configure Domain (Optional)

1. Get a free domain from Freenom:
   - Visit https://www.freenom.com
   - Search for a domain
   - Choose a free TLD (.tk, .ml, .ga, .cf, or .gq)
   - Complete registration

2. Configure DNS:
   - Add an A record pointing to your Oracle Cloud VM's IP address

### Step 4: Enable HTTPS (Optional)

1. Install Certbot and get SSL certificate:
```bash
sudo snap install --classic certbot
sudo certbot --nginx
```

## Installation Instructions for Users

### iOS Users:
1. Open Safari and visit the app URL
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Android Users:
1. Open Chrome and visit the app URL
2. Tap the menu (three dots)
3. Tap "Add to Home screen"
4. Tap "Add"

### Desktop Users:
1. Visit the app URL in Chrome
2. Click the install icon in the address bar
3. Click "Install"

## Development

### Local Setup
1. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

2. Start development servers:
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up
```

### Environment Variables
Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

## Security Features

- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Security headers
- Data encryption
- Secure sessions
- Input sanitization

## Maintenance

### Backup MongoDB Data
```bash
docker exec mongodb mongodump --out /backup
```

### Update Dependencies
```bash
# Backend
cd backend
npm update

# Frontend
cd frontend
npm update
```

### Monitor Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```