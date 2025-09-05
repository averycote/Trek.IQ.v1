# HTTPS Setup for Trek.IQ Development

## 🔒 Why HTTPS is Required

Modern browsers require HTTPS for several APIs that Trek.IQ uses:
- **Geolocation API** - For barrier reporting location detection
- **Service Workers** - For offline caching and push notifications
- **Camera API** - For photo uploads in barrier reports
- **Clipboard API** - For copying coordinates and sharing routes

## 🚀 Quick HTTPS Setup Options

### Option 1: Use mkcert (Recommended)

1. **Install mkcert** (creates locally-trusted certificates):
   ```bash
   # Windows (using Chocolatey)
   choco install mkcert
   
   # Or download from: https://github.com/FiloSottile/mkcert/releases
   ```

2. **Create local certificates**:
   ```bash
   # Install local CA
   mkcert -install
   
   # Create certificate for localhost
   mkcert localhost 127.0.0.1 ::1
   ```

3. **Update package.json** to use HTTPS:
   ```json
   {
     "scripts": {
       "start": "HTTPS=true SSL_CRT_FILE=localhost+2.pem SSL_KEY_FILE=localhost+2-key.pem react-scripts start",
       "start:https": "HTTPS=true SSL_CRT_FILE=localhost+2.pem SSL_KEY_FILE=localhost+2-key.pem react-scripts start"
     }
   }
   ```

4. **Start with HTTPS**:
   ```bash
   npm run start:https
   ```

### Option 2: Use React Scripts Built-in HTTPS

1. **Set environment variable**:
   ```bash
   # Windows PowerShell
   $env:HTTPS="true"; npm start
   
   # Windows CMD
   set HTTPS=true && npm start
   ```

2. **Or create .env file**:
   ```
   HTTPS=true
   ```

3. **Accept the browser warning** (self-signed certificate)

### Option 3: Use ngrok for Public HTTPS

1. **Install ngrok**: https://ngrok.com/download

2. **Start Trek.IQ normally**:
   ```bash
   npm start
   ```

3. **In another terminal, create HTTPS tunnel**:
   ```bash
   ngrok http 3000
   ```

4. **Use the HTTPS URL** provided by ngrok (e.g., `https://abc123.ngrok.io`)

## 🛠️ Current Development Workarounds

Until HTTPS is set up, Trek.IQ includes these fallbacks:

### Geolocation Fallbacks:
- ✅ **Manual coordinate entry** - Users can enter lat/lng manually
- ✅ **Map click selection** - Click on map to select location
- ✅ **Address geocoding** - Enter address to get coordinates
- ✅ **Improved error messages** - Clear instructions for users

### Testing Geolocation:
1. **Chrome DevTools** - Can simulate location even on HTTP
2. **Firefox** - Allows geolocation on localhost HTTP
3. **Mobile testing** - Use ngrok HTTPS tunnel

## 🔧 Recommended Development Setup

For the best Trek.IQ development experience:

1. **Use mkcert** for trusted local HTTPS certificates
2. **Start with HTTPS**: `npm run start:https`
3. **Access at**: `https://localhost:3000`
4. **All APIs work perfectly** without browser warnings

## 📱 Mobile Testing

For testing on mobile devices:

1. **Use ngrok** to create public HTTPS tunnel
2. **Connect mobile to same WiFi**
3. **Access the ngrok HTTPS URL**
4. **All mobile features work** including geolocation

## ⚡ Quick Fix for Current Issue

If you want to test geolocation right now without HTTPS setup:

1. **Open Chrome DevTools** (F12)
2. **Go to Console tab**
3. **Run this command**:
   ```javascript
   navigator.geolocation.getCurrentPosition(
     pos => console.log('Location:', pos.coords),
     err => console.log('Error:', err)
   );
   ```
4. **Chrome will prompt for location permission** even on HTTP in DevTools

## 🎯 Production Considerations

For production deployment:
- ✅ **Always use HTTPS** (required for PWA features)
- ✅ **Valid SSL certificate** (Let's Encrypt, Cloudflare, etc.)
- ✅ **HTTP to HTTPS redirect** for all traffic
- ✅ **HSTS headers** for security

Trek.IQ is already optimized for HTTPS deployment and includes all necessary security headers and PWA configurations.
