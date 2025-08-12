#!/bin/bash

echo "Starting DocuSense Backend Server..."

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
echo "Checking dependencies..."
pip install -r requirements.txt

# Start the server
echo "Starting server on http://localhost:8000..."
echo "Press Ctrl+C to stop the server"
echo ""

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload