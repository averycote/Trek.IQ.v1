# 🚀 Trek.iQ Railway Deployment Guide

Your Trek.iQ project is now configured for Railway deployment! Here's what has been set up:

## 📁 Project Structure

```
trek-iq/
├── server.js              # Main server file (ES modules)
├── public/                 # Frontend static files
│   ├── index.html         # React app entry point
│   └── static/            # CSS, JS, assets
├── server/                 # Backend logic and data
│   ├── data/              # GeoJSON datasets
│   └── routes/            # API routes
├── package.json           # Root dependencies and scripts
├── railway.toml           # Railway configuration
├── Procfile              # Alternative start command
└── .railwayignore        # Files to ignore during deployment
```

## 🔧 Configuration Changes Made

### 1. **New Root Server (`server.js`)**
- ✅ ES modules support (`"type": "module"`)
- ✅ Serves static files from `/public` 
- ✅ API routes under `/api/*`
- ✅ Railway-optimized CORS settings
- ✅ Health check endpoints (`/api/health`, `/healthz`)
- ✅ Graceful shutdown handling

### 2. **Updated `package.json`**
```json
{
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "lru-cache": "^10.0.1"
  }
}
```

### 3. **Railway Configuration**
- `railway.toml` - Optimized for production
- `Procfile` - Alternative start command
- `.railwayignore` - Excludes unnecessary files

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Configure for Railway deployment"
git push origin main
```

### Step 2: Deploy on Railway
1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your `Trek.IQ.v1` repository
4. Railway will automatically detect and deploy your app

### Step 3: Access Your App
Your app will be available at:
- **Frontend**: `https://your-app-name.up.railway.app/`
- **Backend API**: `https://your-app-name.up.railway.app/api/`

## 🌐 URL Structure

| Route | Purpose | Example |
|-------|---------|---------|
| `/` | React frontend | Main app interface |
| `/api/health` | Health check | Server status |
| `/api/hello` | Test endpoint | "Trek.iQ backend is working 🚀" |
| `/api/geocode` | Geocoding API | Address search |
| `/api/route` | Routing API | Calculate routes |
| `/api/data/:filename` | GeoJSON data | Serve datasets |

## 🧪 Local Testing

Test your setup locally:
```bash
# Start the server
npm start

# Test endpoints
curl http://localhost:3000/api/hello
curl http://localhost:3000/api/health
```

The server runs on port 3000 (or `process.env.PORT` on Railway).

## 📱 Mobile Access

Once deployed, your Railway URL will work on mobile devices:
- **Testing**: Use your phone's browser to access the Railway URL
- **PWA**: The app includes offline capabilities and can be "installed" on mobile

## 🔍 Monitoring

Railway provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, and request metrics
- **Health checks**: Automatic monitoring via `/healthz`

## 🚨 Troubleshooting

### Common Issues:
1. **Build fails**: Check that all dependencies are in root `package.json`
2. **404 errors**: Ensure `public/` contains built React files
3. **API not working**: Check CORS settings in `server.js`
4. **Data not loading**: Verify GeoJSON files are in `server/data/`

### Debug Commands:
```bash
# Check if server starts locally
npm start

# Test API endpoints
curl http://localhost:3000/api/health

# Check build files exist
ls public/
```

## 🎯 Next Steps

1. **Deploy**: Push to GitHub and connect to Railway
2. **Test**: Verify both frontend and backend work on Railway URL
3. **Monitor**: Use Railway dashboard to monitor performance
4. **Optimize**: Add environment variables for API keys if needed

Your Trek.iQ app is now ready for Railway deployment! 🎉
