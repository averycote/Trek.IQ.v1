# PowerShell script to start React client with environment variables
Write-Host "Setting environment variables..." -ForegroundColor Green
$env:REACT_APP_TRANSIT_API_KEY = "cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b"
$env:REACT_APP_TRANSIT_API_URL = "https://external.transitapp.com/v3"
$env:REACT_APP_API_BASE_URL = "http://localhost:3001/api"

Write-Host "Environment variables set:" -ForegroundColor Green
Write-Host "REACT_APP_TRANSIT_API_KEY: SET (hidden for security)" -ForegroundColor Yellow
Write-Host "REACT_APP_TRANSIT_API_URL: $env:REACT_APP_TRANSIT_API_URL" -ForegroundColor Yellow
Write-Host "REACT_APP_API_BASE_URL: $env:REACT_APP_API_BASE_URL" -ForegroundColor Yellow

Write-Host "`nChanging to client directory..." -ForegroundColor Green
Set-Location client

Write-Host "Starting React development server..." -ForegroundColor Green
Write-Host "The app will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the server when done.`n" -ForegroundColor Red

npm start
