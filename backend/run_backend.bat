@echo off
echo Starting DocuSense Backend (Simplified)...

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

:: Install dependencies
echo Installing dependencies...
pip install -r requirements_simple.txt

:: Create directories
if not exist "uploads" mkdir uploads
if not exist "audio_cache" mkdir audio_cache

:: Start the server
echo Starting backend server...
echo Backend will be available at http://localhost:8000
echo Press Ctrl+C to stop the server
python -m uvicorn main_simple:app --host 0.0.0.0 --port 8000 --reload

pause