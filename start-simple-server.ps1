# Simple HTTP Server for Trek.IQ Testing
Write-Host "🌐 Starting Simple HTTP Server for Trek.IQ..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
$pythonAvailable = $false
try {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion) {
        Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
        $pythonAvailable = $true
    }
} catch {
    Write-Host "❌ Python not found" -ForegroundColor Red
}

# Check if Node.js is available
$nodeAvailable = $false
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
        $nodeAvailable = $true
    }
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
}

Write-Host ""

# Choose the best option
if ($nodeAvailable) {
    Write-Host "🚀 Starting Node.js HTTP server on port 8080..." -ForegroundColor Green
    Write-Host "📁 Serving from: client/build directory" -ForegroundColor Yellow
    Write-Host ""
    
    # Create simple Node.js server
    @"
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'simple-http', port: PORT });
});

// Catch all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🌐 Simple HTTP Server running at:');
  console.log('   Local:   http://localhost:' + PORT);
  console.log('   Network: http://0.0.0.0:' + PORT);
  console.log('');
  console.log('📁 Serving static files from: client/build');
  console.log('⏹️  Press Ctrl+C to stop');
});
"@ | Out-File -FilePath "simple-server.js" -Encoding UTF8

    node simple-server.js
    
} elseif ($pythonAvailable) {
    Write-Host "🚀 Starting Python HTTP server on port 8080..." -ForegroundColor Green
    Write-Host "📁 Serving from: client/build directory" -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location "client/build"
    python -m http.server 8080
    
} else {
    Write-Host "❌ Neither Node.js nor Python found!" -ForegroundColor Red
    Write-Host "Please install Node.js or Python to run a simple server." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: You can try opening client/build/index.html directly in your browser" -ForegroundColor Cyan
    exit 1
}


