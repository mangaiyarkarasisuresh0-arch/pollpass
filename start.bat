@echo off
echo ===================================================
echo   Starting PollPulse - Full-Stack Real-Time Polling
echo ===================================================

echo [1/3] Starting Redis Server on port 6379...
start "PollPulse - Redis" cmd /k ".\redis\redis-server.exe --port 6379"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Go Backend on port 8080...
start "PollPulse - Backend (Go/Gin)" cmd /k "cd backend && go run ./cmd/server"

timeout /t 2 /nobreak >nul

echo [3/3] Starting React Frontend on port 5173...
start "PollPulse - Frontend (Vite/React)" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo ===================================================
echo   All services are up and running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8080/api
echo ===================================================
pause
