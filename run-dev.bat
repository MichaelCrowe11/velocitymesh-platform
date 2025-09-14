@echo off
echo Starting VelocityMesh Development Environment
echo ==========================================

REM Check if Docker is running
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Starting infrastructure services...
docker-compose up -d postgres redis vector-db

REM Wait for databases to start
echo Waiting for databases to initialize...
timeout /t 10

echo Starting development servers...

REM Start backend in new window
start "VelocityMesh Backend" cmd /c "cd backend && npm run dev"

REM Start AI engine in new window
start "VelocityMesh AI Engine" cmd /c "cd ai-engine && python main.py"

REM Start frontend in new window
start "VelocityMesh Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ==========================================
echo VelocityMesh is starting up!
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo AI Engine: http://localhost:8000
echo.
echo Press any key to view logs or Ctrl+C to stop
pause

REM Show combined logs
docker-compose logs -f