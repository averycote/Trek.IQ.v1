# 🚀 Start Trek.IQ Application - Simple Instructions

## Quick Start (2 Terminals Needed)

### Terminal 1: Start Backend Server
```powershell
cd server
node index.js
```
**Expected output:** You should see:
```
🚀 Trek.IQ Server running on port 3001
🌐 Server accessible at:
   - Local: http://localhost:3001
```

### Terminal 2: Start React App
```powershell
# Set environment variable
$env:REACT_APP_TRANSIT_API_KEY="cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b"

# Start React app
cd client
npm start
```

**Expected output:** React development server should start and open browser to `http://localhost:3000`

## ✅ Verification
- Backend: http://localhost:3001/healthz should return `{"ok":true,...}`
- Frontend: http://localhost:3000 should show your Trek.IQ app

## 🔧 If You Get "Username/Password" Prompt
This might be from:
1. **Proxy authentication** - Just dismiss it or enter any dummy credentials
2. **Corporate firewall** - The app should still work locally
3. **React dev server** - This is normal, just continue

## 🆘 If Servers Don't Start
1. **Port already in use**: Run `taskkill /F /IM node.exe` to kill existing processes
2. **Permission issues**: Make sure you're in the right directory
3. **Missing dependencies**: Run `npm install` in both root and server directories

## 🎯 Success Indicators
- ✅ Server logs show "Trek.IQ Server running on port 3001"
- ✅ React app compiles with warnings (warnings are normal)
- ✅ Browser opens to localhost:3000
- ✅ App loads with map and navigation features

The app is designed to work even if the Transit API is unavailable - it will use fallback Halifax data.
