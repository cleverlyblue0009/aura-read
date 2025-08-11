# DocuSense - Intelligent PDF Reading Application

An advanced AI-powered PDF reading application that combines document intelligence, accessibility features, and LLM-powered insights for enhanced document comprehension.

## 🚀 Features

### Core Features
- **High-Fidelity PDF Rendering**: Adobe PDF Embed API for 100% fidelity PDF display
- **Bulk PDF Upload**: Upload multiple PDFs for historical document analysis
- **Document Intelligence**: AI-powered section highlighting and relevance ranking
- **Smart Navigation**: Intelligent document outline with related section discovery

### Accessibility Features
- **Universal Design**: Font size and color customization for dyslexia and color blindness
- **Voice Reading**: Text-to-speech functionality for audio consumption
- **Reading Progress**: Time tracking and progress estimation
- **Text Simplification**: AI-powered difficulty adjustment

### AI-Powered Features
- **Insights Bulb**: LLM-generated key insights, facts, and connections
- **Podcast Mode**: AI-narrated audio summaries with Azure TTS
- **Term Definitions**: Hover-based complex term explanations
- **Related Content**: Intelligent cross-document section recommendations

## 🏗️ Architecture

```
DocuSense/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── lib/         # API services
│   │   └── pages/       # Application pages
├── backend/           # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── pdf_analyzer.py   # Round 1A PDF processing
│   │   ├── document_intelligence.py  # Round 1B intelligence
│   │   ├── llm_services.py   # Gemini integration
│   │   └── tts_service.py    # Azure TTS integration
│   └── requirements.txt
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+
- API Keys:
  - Google Gemini API key
  - Azure Speech Services key
  - Adobe PDF Embed API client ID (optional)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the backend server**:
   ```bash
   python start.py
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory** (project root):
   ```bash
   # Already in root directory
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## 🔑 Required API Keys

### Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

### Azure Speech Services
1. Create an Azure account and Speech resource
2. Get your subscription key and region
3. Add to `.env` as `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`

### Adobe PDF Embed API (Optional)
1. Visit [Adobe Developer Console](https://developer.adobe.com/)
2. Create a new project and add PDF Embed API
3. Get your client ID
4. Add to `.env` as `VITE_ADOBE_CLIENT_ID`

## 📖 Usage

1. **Upload PDFs**: Drag and drop or select PDF files on the landing page
2. **Set Context**: Define your role (persona) and what you want to accomplish
3. **Start Reading**: The application will analyze documents and provide intelligent insights
4. **Explore Features**:
   - View related sections highlighted automatically
   - Generate AI insights with the Insights Bulb
   - Listen to podcast-style summaries
   - Adjust accessibility settings
   - Simplify text difficulty
   - Get term definitions on hover

## 🔧 Development

### Backend Development
- The backend uses FastAPI with automatic API documentation at `/docs`
- PDF processing is handled by PyMuPDF (fitz)
- Document intelligence uses TF-IDF and custom scoring algorithms
- LLM integration uses Google's Gemini 2.0 Flash model

### Frontend Development
- Built with React 18, TypeScript, and Tailwind CSS
- Uses Adobe PDF Embed API for high-fidelity rendering
- Shadcn/ui components for consistent design
- Real-time API integration with the backend

### Testing the Application
1. Start both backend and frontend servers
2. Upload sample PDF documents
3. Set a persona (e.g., "Researcher") and job (e.g., "Analyzing AI trends")
4. Explore the intelligent features and AI-powered insights

## 🚀 Production Deployment

### Backend
```bash
# Install production dependencies
pip install -r requirements.txt

# Set production environment variables
export GEMINI_API_KEY=your_key
export AZURE_SPEECH_KEY=your_key
export AZURE_SPEECH_REGION=your_region

# Run with production ASGI server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# Build for production
npm run build

# Serve static files (use nginx, apache, or any static server)
npm run preview
```

## 📝 API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

## 🤝 Contributing

This is a hackathon project. For issues or improvements, please refer to the project documentation.

## 📄 License

This project is part of a hackathon submission and is provided as-is for demonstration purposes.
