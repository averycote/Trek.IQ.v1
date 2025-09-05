const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8080;

console.log('🚀 Starting Trek.IQ Frontend Server on port 8080...');

// API Proxy to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8081',
  changeOrigin: true,
  logLevel: 'info'
}));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Health check for frontend
app.get('/frontend-health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'trek-iq-frontend',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Trek.IQ Frontend Server running!');
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🌐 Backend:  http://localhost:8081`);
  console.log('');
  console.log('🎯 ACCESS YOUR APP: http://localhost:8080');
  console.log('⏹️  Press Ctrl+C to stop');
});


