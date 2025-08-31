# Start Trek.IQ Application
Write-Host "🚀 Starting Trek.IQ Application..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing node processes
Write-Host "⏹️  Stopping any existing processes..." -ForegroundColor Yellow
try {
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
} catch {
    Write-Host "No existing processes to stop" -ForegroundColor Gray
}

# Set environment variables
Write-Host "🔧 Setting environment variables..." -ForegroundColor Green
$env:REACT_APP_TRANSIT_API_KEY = "cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b"
$env:REACT_APP_TRANSIT_API_URL = "https://external.transitapp.com/v3"
$env:REACT_APP_API_BASE_URL = "http://localhost:3001/api"

# Start server in background
Write-Host "🖥️  Starting backend server on port 3001..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\avery\trek-iq\server"
    node index.js
}

# Wait for server to start
Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep 5

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/healthz" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Server is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Server failed to start. Checking logs..." -ForegroundColor Red
    Receive-Job $serverJob
    exit 1
}

# Start React app
Write-Host "⚛️  Starting React development server on port 3000..." -ForegroundColor Green
Set-Location "client"

Write-Host ""
Write-Host "🌐 The application will be available at:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers when done." -ForegroundColor Red
Write-Host ""

# Start React app (this will run in foreground)
npm start
