#!/usr/bin/env python3
"""
DocuSense Mock Backend Startup Script
This script starts the mock backend server for demonstration purposes.
"""

import os
import sys
import subprocess
import time

def install_dependencies():
    """Install required dependencies."""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "--break-system-packages", "-r", "requirements_mock.txt"
        ], check=True)
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    return True

def create_directories():
    """Create necessary directories."""
    print("📁 Creating directories...")
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("audio_cache", exist_ok=True)
    print("✅ Directories created")

def start_server():
    """Start the FastAPI server."""
    print("🚀 Starting DocuSense Mock Backend...")
    print("📱 Server will be available at: http://localhost:8000")
    print("📚 API documentation at: http://localhost:8000/docs")
    print("🔧 Health check at: http://localhost:8000/health")
    print("")
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "app.mock_backend:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

def main():
    """Main function."""
    print("🎯 DocuSense Mock Backend")
    print("=" * 30)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()