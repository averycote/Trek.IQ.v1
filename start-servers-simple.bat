@echo off
echo 🚀 Starting Trek.IQ on Alternative Ports...
echo.

REM Kill any existing Node processes
taskkill /f /im node.exe >nul 2>&1

echo 1️⃣ Starting backend server on port 8081...
cd server
set PORT=8081
start "Trek.IQ Backend" cmd /k "node index.js"

echo ⏳ Waiting for backend to start...
timeout /t 8 /nobreak >nul

echo 2️⃣ Starting frontend server on port 8080...
cd ..\client
set PORT=8080
set REACT_APP_API_BASE_URL=http://localhost:8081/api
set BROWSER=none

echo 🌐 Starting React development server...
start "Trek.IQ Frontend" cmd /k "npm start"

echo.
echo ✅ Both servers are starting!
echo 🌐 Frontend will be available at: http://localhost:8080
echo 🌐 Backend API available at: http://localhost:8081
echo.
echo ⏳ Please wait 1-2 minutes for React to compile...
echo 📝 Two command windows will open - don't close them!
echo.
pause
