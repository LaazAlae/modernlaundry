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