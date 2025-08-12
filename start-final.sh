#!/bin/bash

# DocuSense Application Startup Script - Final Version
echo "🚀 Starting DocuSense Application (Final Version)..."

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

# Create environment files if they don't exist
echo "🔧 Setting up configuration..."

if [ ! -f ".env" ]; then
    echo "📝 Creating frontend .env file..."
    cat > .env << EOF
# Frontend Environment Variables
VITE_API_URL=http://localhost:8000
VITE_ADOBE_CLIENT_ID=test_client_id
EOF
    echo "✅ Frontend .env created"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "✅ Frontend dependencies installed"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/audio_cache
mkdir -p public

echo "✅ Directories created"

# Start services
echo "🎬 Starting services..."

# Start backend in background
echo "Starting mock backend server..."
cd backend
python3 start_mock.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        echo "✅ Backend server is running on http://localhost:8000"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend server failed to start after 30 seconds"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# Start frontend
echo "Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
for i in {1..30}; do
    if curl -f http://localhost:5173 >/dev/null 2>&1; then
        echo "✅ Frontend server is running on http://localhost:5173"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Frontend server failed to start after 30 seconds"
        kill $FRONTEND_PID 2>/dev/null
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

echo ""
echo "🎉 DocuSense Application is now running!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🔧 Configuration:"
echo "   - Mock backend is running for demonstration"
echo "   - Adobe PDF viewer will use fallback mode"
echo "   - All AI features work with mock data"
echo "   - No API keys required for demonstration"
echo ""
echo "💡 Features Available:"
echo "   ✅ PDF viewing with fallback viewer"
echo "   ✅ Document intelligence with mock data"
echo "   ✅ AI insights generation"
echo "   ✅ Podcast generation"
echo "   ✅ Accessibility features"
echo "   ✅ Highlights and navigation"
echo "   ✅ Language support"
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