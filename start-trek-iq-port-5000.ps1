# Trek.IQ Server on Port 5000 (Alternative to 3000)
Write-Host "🚀 Starting Trek.IQ on Port 5000..." -ForegroundColor Cyan
Write-Host "This script uses port 5000 for frontend and 5001 for backend" -ForegroundColor Yellow
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
$env:PORT = "5001"
$env:REACT_APP_TRANSIT_API_KEY = "cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b"
$env:REACT_APP_TRANSIT_API_URL = "https://external.transitapp.com/v3"
$env:REACT_APP_API_BASE_URL = "http://localhost:5001/api"

# Start server on port 5001
Write-Host "🖥️  Starting backend server on port 5001..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\avery\trek-iq\server"
    $env:PORT = "5001"
    node index.js
}

# Wait for server to start
Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep 5

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/healthz" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Server is running on port 5001!" -ForegroundColor Green
} catch {
    Write-Host "❌ Server failed to start on port 5001. Checking logs..." -ForegroundColor Red
    Receive-Job $serverJob
    exit 1
}

# Backup original package.json
Copy-Item "client/package.json" "client/package.json.backup" -Force

# Update client proxy for port 5001
Write-Host "🔧 Updating client configuration..." -ForegroundColor Green
$packageJsonPath = "client/package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$packageJson.proxy = "http://localhost:5001"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath

# Start React app on port 5000
Write-Host "⚛️  Starting React development server on port 5000..." -ForegroundColor Green
Set-Location "client"

Write-Host ""
Write-Host "🌐 The application will be available at:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:5001" -ForegroundColor White
Write-Host ""
Write-Host "📝 Note: package.json proxy has been updated (backup saved)" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop all servers when done." -ForegroundColor Red
Write-Host ""

# Set PORT for React app and start
$env:PORT = "5000"
npm start
