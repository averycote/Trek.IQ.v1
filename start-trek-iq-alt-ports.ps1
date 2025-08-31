# Alternative Trek.IQ Server Configuration - Different Ports
Write-Host "🚀 Starting Trek.IQ with Alternative Ports..." -ForegroundColor Cyan
Write-Host "Using ports 8080 (frontend) and 8081 (backend)" -ForegroundColor Yellow
Write-Host ""

# Kill any existing processes on alternative ports
Write-Host "⏹️  Stopping any existing processes..." -ForegroundColor Yellow
try {
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
} catch {
    Write-Host "No existing processes to stop" -ForegroundColor Gray
}

# Set environment variables for alternative configuration
Write-Host "🔧 Setting environment variables..." -ForegroundColor Green
$env:PORT = "8081"
$env:REACT_APP_TRANSIT_API_KEY = "cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b"
$env:REACT_APP_TRANSIT_API_URL = "https://external.transitapp.com/v3"
$env:REACT_APP_API_BASE_URL = "http://localhost:8081/api"

# Start server on port 8081
Write-Host "🖥️  Starting backend server on port 8081..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\avery\trek-iq\server"
    $env:PORT = "8081"
    node index.js
}

# Wait for server to start
Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep 5

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/healthz" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Server is running on port 8081!" -ForegroundColor Green
} catch {
    Write-Host "❌ Server failed to start on port 8081. Checking logs..." -ForegroundColor Red
    Receive-Job $serverJob
    exit 1
}

# Update client proxy and start on port 8080
Write-Host "⚛️  Starting React development server on port 8080..." -ForegroundColor Green
Set-Location "client"

# Temporarily update package.json proxy
$packageJsonPath = "package.json"
$packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
$packageJson.proxy = "http://localhost:8081"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath

Write-Host ""
Write-Host "🌐 The application will be available at:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers when done." -ForegroundColor Red
Write-Host ""

# Set PORT for React app and start
$env:PORT = "8080"
npm start
