# Railway Deployment Guide for Trek.IQ

## Overview
This guide explains how to deploy Trek.IQ to Railway.app.

## Pre-deployment Setup

### 1. Project Structure
The app consists of:
- **Root**: Main package.json with deployment scripts
- **Client**: React frontend (builds to client/build/)
- **Server**: Express.js backend that serves both API and static files

### 2. Build Process
Railway will automatically:
1. Run `npm install` (installs root dependencies)
2. Run `npm run postinstall` (which runs `npm run build`)
3. Build process installs all dependencies and builds React client
4. Run `npm start` (starts the Express server)

## Railway Configuration

### Environment Variables
Set these in Railway dashboard:

```
NODE_ENV=production
PORT=8080
```

Optional (for email features):
```
CITY_EMAIL=accessibility@halifax.ca
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_USER=admin
ADMIN_PASS=your-secure-password
```

### Port Configuration
- Railway automatically provides `PORT` environment variable
- Server listens on `process.env.PORT || 8081`
- Frontend is served from the same port as the API

## Deployment Steps

1. **Connect Repository**: Link your GitHub repo to Railway
2. **Set Environment Variables**: Add the variables listed above
3. **Deploy**: Railway will automatically build and deploy
4. **Monitor**: Check logs for any issues

## Architecture
```
Railway App (PORT from env)
├── Static Files (React build) → /*
├── API Routes → /api/*
├── Health Check → /healthz
└── SPA Fallback → /* (serves index.html)
```

## Troubleshooting

### Common Issues:
1. **Build fails**: Check that all dependencies are in package.json
2. **CORS errors**: CORS is configured for Railway domains (.railway.app)
3. **Static files not found**: Ensure client build completed successfully
4. **Database issues**: SQLite database is included in the repo

### Debug Commands:
- Check health: `GET /healthz`
- Check API: `GET /api/health`
- Frontend health: `GET /frontend-health` (if using separate frontend server)

## File Structure After Build:
```
/
├── client/build/          # Built React app
├── server/               # Express server
├── package.json          # Root package with start script
└── railway.toml          # Railway configuration
```

## Notes:
- The app serves both frontend and backend from a single Express server
- Static files are served with caching headers for performance
- Database is SQLite with file-based storage (included in repo)
- All routes fallback to React SPA for client-side routing
