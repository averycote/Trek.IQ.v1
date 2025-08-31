@echo off
REM Kill any existing processes on ports 3000 and 3001
echo Stopping any existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /PID %%a /F 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Set environment variables
set REACT_APP_TRANSIT_API_KEY=cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b
set REACT_APP_TRANSIT_API_URL=https://external.transitapp.com/v3
set REACT_APP_API_BASE_URL=http://localhost:3001/api

echo Starting Trek.IQ servers...
echo.
echo Server will be at: http://localhost:3001
echo React app will be at: http://localhost:3000
echo.

REM Start both servers
start "Trek.IQ Server" cmd /c "cd server && npm run dev"
timeout /t 3 /nobreak >nul
start "Trek.IQ Client" cmd /c "cd client && npm start"

echo.
echo Servers are starting...
echo Press any key to continue once both servers are running.
pause
