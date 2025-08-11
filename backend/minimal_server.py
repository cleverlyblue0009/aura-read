from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF Reader API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Backend is running"}

@app.post("/upload-pdfs")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """Upload PDFs and return mock document info"""
    logger.info(f"Received {len(files)} files for upload")
    
    documents = []
    for i, file in enumerate(files):
        if file.content_type != "application/pdf":
            continue
            
        # Mock document response
        doc = {
            "id": f"doc_{i + 1}",
            "name": file.filename,
            "title": file.filename.replace(".pdf", ""),
            "outline": [
                {"level": "H1", "text": "Introduction", "page": 1},
                {"level": "H1", "text": "Methodology", "page": 5},
                {"level": "H2", "text": "Data Collection", "page": 6},
                {"level": "H1", "text": "Results", "page": 10},
                {"level": "H1", "text": "Conclusion", "page": 15}
            ],
            "language": "en",
            "upload_timestamp": "2024-01-01T00:00:00Z"
        }
        documents.append(doc)
        logger.info(f"Processed file: {file.filename}")
    
    return documents

@app.get("/pdf/{doc_id}")
async def get_pdf(doc_id: str):
    """Serve PDF file - for now return a 404 with helpful message"""
    return JSONResponse(
        status_code=404,
        content={"message": f"PDF {doc_id} not found. This is a minimal backend for testing."}
    )

@app.post("/related-sections")
async def get_related_sections(request: dict):
    """Get related sections - mock response"""
    return {
        "related_sections": [
            {
                "document": "doc_1",
                "section_title": "AI Applications in Healthcare",
                "page_number": 3,
                "relevance_score": 0.95,
                "explanation": "Highly relevant to current context"
            },
            {
                "document": "doc_1", 
                "section_title": "Machine Learning Algorithms",
                "page_number": 7,
                "relevance_score": 0.88,
                "explanation": "Related technical content"
            }
        ]
    }

@app.post("/insights")
async def generate_insights(request: dict):
    """Generate insights - mock response"""
    return {
        "insights": [
            {
                "type": "takeaway",
                "content": "This section highlights the transformative potential of AI in healthcare delivery."
            },
            {
                "type": "fact", 
                "content": "Studies show 94% accuracy improvement with machine learning algorithms."
            }
        ]
    }

@app.post("/podcast")
async def generate_podcast(request: dict):
    """Generate podcast - mock response"""
    return {
        "script": "Welcome to your AI-generated podcast summary. Today we're discussing the key insights from your document...",
        "audio_url": "http://localhost:8000/audio/mock_podcast.mp3"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")