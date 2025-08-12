# DocuSense PDF Reader - Setup Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)

### Option 1: Automatic Setup (Recommended)

#### For Windows:
1. Open Command Prompt or PowerShell as Administrator
2. Navigate to the project directory
3. Run the frontend:
   ```bash
   ./run-project.sh
   ```
4. Open a new terminal and run the backend:
   ```bash
   cd backend
   run_backend.bat
   ```

#### For Linux/Mac:
1. Open terminal
2. Navigate to the project directory
3. Run the frontend:
   ```bash
   ./run-project.sh
   ```
4. Open a new terminal and run the backend:
   ```bash
   cd backend
   ./run_backend.sh
   ```

### Option 2: Manual Setup

#### Frontend Setup
1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

#### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements_simple.txt
   ```

3. Start the backend server:
   ```bash
   python -m uvicorn main_simple:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Backend will be available at `http://localhost:8000`

## 🎯 Features

### ✅ Working Features
- **PDF Upload & Viewing**: Upload PDFs and view them with Adobe PDF Embed API or fallback iframe viewer
- **Smart Highlights**: Automatically create highlights from text selection
- **AI Insights**: Generate contextual insights based on your persona and job role
- **Podcast Generation**: Create audio summaries using browser text-to-speech
- **Language Switching**: Change interface language with visual feedback
- **Accessibility Features**: Font size adjustment, reading modes, and more
- **Export Options**: Copy and download highlights, insights, and summaries

### 🔧 Technical Features
- **Hybrid PDF Viewer**: Tries Adobe API first, gracefully falls back to iframe
- **Offline Fallbacks**: All features work without complex backend dependencies
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Module not found" errors in backend
**Solution**: Use the simplified backend
```bash
cd backend
python -m uvicorn main_simple:app --host 0.0.0.0 --port 8000
```

#### 2. Frontend won't start
**Solution**: Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### 3. PDF won't load
**Solutions**:
- Click "Use Simple Viewer" button in the PDF viewer
- Check that the backend is running on port 8000
- Ensure CORS is enabled in your browser

#### 4. Features not working
**Solution**: The app has built-in fallbacks:
- Insights will generate locally if backend is unavailable
- Podcast uses browser TTS if backend fails
- All features have mock implementations for testing

### Port Conflicts

If you get port conflicts:

**Frontend (default: 5173)**:
```bash
npm run dev -- --port 3000
```

**Backend (default: 8000)**:
```bash
python -m uvicorn main_simple:app --host 0.0.0.0 --port 8001
```
Then update the API URL in `src/lib/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8001';
```

## 📁 Project Structure

```
docusense-pdf-reader/
├── src/                    # Frontend React code
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   └── pages/            # Page components
├── backend/               # Python FastAPI backend
│   ├── app/              # Application code
│   ├── main_simple.py    # Simplified backend (recommended)
│   └── requirements_simple.txt
├── public/               # Static assets
└── run-project.sh        # Quick start script
```

## 🎨 Customization

### Adding Adobe PDF Embed API Key
1. Get an API key from [Adobe Developer Console](https://developer.adobe.com/)
2. Create a `.env` file in the root directory:
   ```
   VITE_ADOBE_CLIENT_ID=your_client_id_here
   ```

### Changing Theme Colors
Edit `tailwind.config.ts` to customize the color scheme.

### Adding New Languages
Edit `src/components/AccessibilityPanel.tsx` and add your language to the `languages` array.

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy the `dist` folder

### Backend (Railway/Render/Heroku)
1. Use `main_simple.py` as your entry point
2. Set the start command: `uvicorn main_simple:app --host 0.0.0.0 --port $PORT`

## 📞 Support

If you encounter issues:

1. **Check this guide** for common solutions
2. **Verify prerequisites** are installed correctly
3. **Use simplified backend** (`main_simple.py`) to avoid dependency issues
4. **Check browser console** for error messages
5. **Try fallback features** - most functionality works offline

## 🎉 Success!

Once both frontend and backend are running:
1. Go to `http://localhost:5173`
2. Upload a PDF file
3. Explore the intelligent reading features
4. Try the AI insights, podcast generation, and highlighting tools

Enjoy your intelligent PDF reading experience! 📚✨