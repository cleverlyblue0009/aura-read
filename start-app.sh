#!/bin/bash

# DocuSense Application Startup Script
echo "🚀 Starting DocuSense Application..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists python3; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Node.js and npm are required but not installed."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Check for environment files
echo "🔧 Checking configuration..."

if [ ! -f ".env" ]; then
    echo "⚠️  Frontend .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit .env with your configuration"
fi

if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Creating from example..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env with your API keys"
fi

# Install dependencies
echo "📦 Installing dependencies..."

echo "Installing frontend dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "✅ Dependencies installed"

# Start services
echo "🎬 Starting services..."

# Start backend in background
echo "Starting backend server..."
cd backend
python start.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend server is running on http://localhost:8000"
else
    echo "❌ Backend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

echo ""
echo "🎉 DocuSense Application is now running!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "💡 Make sure to configure your API keys in the .env files!"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Wait for processes
wait