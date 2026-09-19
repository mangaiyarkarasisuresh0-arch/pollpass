Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting PollPulse - Full-Stack Real-Time Polling" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Start Redis
Write-Host "[1/3] Starting Redis on port 6379..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\redis\redis-server.exe --port 6379"

Start-Sleep -Seconds 2

# 2. Start Go Backend
Write-Host "[2/3] Starting Go Backend on port 8080..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; go run ./cmd/server"

Start-Sleep -Seconds 2

# 3. Start React Frontend
Write-Host "[3/3] Starting React Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8080/api"
