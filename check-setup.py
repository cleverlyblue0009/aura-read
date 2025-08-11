#!/usr/bin/env python3
"""
DocuSense Setup Verification Script
Checks if all dependencies and API keys are properly configured.
"""
import os
import sys
import subprocess
from dotenv import load_dotenv

def check_python_packages():
    """Check if required Python packages are installed."""
    required_packages = [
        'fastapi', 'uvicorn', 'PyMuPDF', 'langdetect', 
        'scikit-learn', 'numpy', 'aiofiles', 'requests',
        'azure-cognitiveservices-speech', 'google-generativeai'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    return missing_packages

def check_environment_variables():
    """Check if required environment variables are set."""
    load_dotenv('backend/.env')
    
    required_vars = {
        'GEMINI_API_KEY': 'Google Gemini API key for LLM features',
        'AZURE_SPEECH_KEY': 'Azure Speech Services key for TTS',
    }
    
    optional_vars = {
        'AZURE_SPEECH_REGION': 'Azure Speech Services region',
        'VITE_ADOBE_CLIENT_ID': 'Adobe PDF Embed API client ID'
    }
    
    missing_required = []
    missing_optional = []
    
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing_required.append((var, description))
    
    for var, description in optional_vars.items():
        if not os.getenv(var):
            missing_optional.append((var, description))
    
    return missing_required, missing_optional

def check_node_dependencies():
    """Check if Node.js dependencies are installed."""
    try:
        result = subprocess.run(['npm', 'list'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def main():
    print("🔍 DocuSense Setup Verification")
    print("=" * 40)
    
    # Check Python packages
    print("\n📦 Checking Python packages...")
    missing_py = check_python_packages()
    if missing_py:
        print(f"❌ Missing Python packages: {', '.join(missing_py)}")
        print("   Run: cd backend && pip install -r requirements.txt")
    else:
        print("✅ All Python packages are installed")
    
    # Check environment variables
    print("\n🔑 Checking environment variables...")
    missing_req, missing_opt = check_environment_variables()
    
    if missing_req:
        print("❌ Missing required environment variables:")
        for var, desc in missing_req:
            print(f"   - {var}: {desc}")
        print("   Please configure these in backend/.env")
    else:
        print("✅ All required environment variables are set")
    
    if missing_opt:
        print("⚠️  Missing optional environment variables:")
        for var, desc in missing_opt:
            print(f"   - {var}: {desc}")
        print("   These are optional but recommended for full functionality")
    
    # Check Node.js dependencies
    print("\n📦 Checking Node.js dependencies...")
    if check_node_dependencies():
        print("✅ Node.js dependencies are installed")
    else:
        print("❌ Node.js dependencies missing or outdated")
        print("   Run: npm install")
    
    # Overall status
    print("\n" + "=" * 40)
    if not missing_py and not missing_req and check_node_dependencies():
        print("🎉 Setup verification passed! You're ready to run DocuSense.")
        print("\nTo start the application:")
        print("  ./start-app.sh")
        print("\nOr manually:")
        print("  Backend:  cd backend && python start.py")
        print("  Frontend: npm run dev")
    else:
        print("❌ Setup verification failed. Please fix the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())