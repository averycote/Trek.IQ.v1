@echo off
REM Set environment variables for Trek.IQ development
set REACT_APP_TRANSIT_API_KEY=cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b
set REACT_APP_TRANSIT_API_URL=https://external.transitapp.com/v3
set REACT_APP_API_BASE_URL=http://localhost:3001/api

echo Environment variables set for this session
echo Starting Trek.IQ development servers...
npm run dev
