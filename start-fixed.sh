#!/bin/bash

# DocuSense Application Startup Script - Fixed Version
echo "🚀 Starting DocuSense Application (Fixed Version)..."

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

if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cat > backend/.env << EOF
# Backend Environment Variables
GEMINI_API_KEY=your_gemini_api_key_here
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=your_azure_region_here

# Enable mock mode for demonstration
ENABLE_MOCK_MODE=true
EOF
    echo "✅ Backend .env created"
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

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/audio_cache
mkdir -p public

echo "✅ Directories created"

# Start services
echo "🎬 Starting services..."

# Start backend in background
echo "Starting backend server..."
cd backend
python start.py &
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
echo "   - Mock mode is enabled for demonstration"
echo "   - Adobe PDF viewer will use fallback mode"
echo "   - AI features will work with mock data"
echo ""
echo "💡 To enable full features:"
echo "   1. Get API keys from Google AI Studio and Azure"
echo "   2. Update backend/.env with your API keys"
echo "   3. Set ENABLE_MOCK_MODE=false in backend/.env"
echo "   4. Get Adobe PDF Embed API client ID"
echo "   5. Update frontend .env with VITE_ADOBE_CLIENT_ID"
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