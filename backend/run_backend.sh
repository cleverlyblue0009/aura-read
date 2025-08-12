#!/bin/bash

echo "🚀 Starting DocuSense Backend (Simplified)..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ Python is not installed. Please install Python first."
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    if ! command -v pip &> /dev/null; then
        echo "❌ pip is not installed. Please install pip first."
        exit 1
    else
        PIP_CMD="pip"
    fi
else
    PIP_CMD="pip3"
fi

# Install dependencies
echo "📦 Installing dependencies..."
$PIP_CMD install -r requirements_simple.txt

# Create directories
mkdir -p uploads
mkdir -p audio_cache

# Start the server
echo "🌟 Starting backend server..."
echo "🔗 Backend will be available at http://localhost:8000"
echo "🔧 Press Ctrl+C to stop the server"
$PYTHON_CMD -m uvicorn main_simple:app --host 0.0.0.0 --port 8000 --reload