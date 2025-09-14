#!/bin/bash

echo "Starting VelocityMesh Development Environment"
echo "=========================================="

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "Starting infrastructure services..."
docker-compose up -d postgres redis vector-db

# Wait for databases to start
echo "Waiting for databases to initialize..."
sleep 10

echo "Starting development servers..."

# Start backend
echo "Starting backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start AI engine
echo "Starting AI engine..."
cd ai-engine
python main.py &
AI_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "VelocityMesh is now running!"
echo ""
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:3001"
echo "AI Engine: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup processes on exit
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $AI_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    docker-compose down
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait