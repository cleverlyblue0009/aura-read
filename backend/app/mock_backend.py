import os
import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import json

app = FastAPI(title="DocuSense API - Mock Mode", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for documents and analysis results
documents_store: Dict[str, Dict[str, Any]] = {}
analysis_cache: Dict[str, Dict[str, Any]] = {}

# Pydantic models
class DocumentInfo(BaseModel):
    id: str
    name: str
    title: str
    outline: List[Dict[str, Any]]
    language: str
    upload_timestamp: str

class AnalysisRequest(BaseModel):
    document_ids: List[str]
    persona: str
    job_to_be_done: str

class RelatedSectionsRequest(BaseModel):
    document_ids: List[str]
    current_page: int
    current_section: str
    persona: str
    job_to_be_done: str

class InsightsRequest(BaseModel):
    text: str
    persona: str
    job_to_be_done: str
    document_context: Optional[str] = None

class PodcastRequest(BaseModel):
    text: str
    related_sections: List[str]
    insights: List[str]

class SimplifyTextRequest(BaseModel):
    text: str
    difficulty_level: str = "simple"

class TermDefinitionRequest(BaseModel):
    term: str
    context: str

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("audio_cache", exist_ok=True)
    print("DocuSense Mock API started successfully")

@app.get("/")
async def root():
    return {"message": "DocuSense Mock API is running", "version": "1.0.0"}

@app.post("/upload-pdfs", response_model=List[DocumentInfo])
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """Upload and process multiple PDF files."""
    uploaded_docs = []
    
    for file in files:
        if not file.filename.endswith('.pdf'):
            continue
            
        # Generate unique ID and save file
        doc_id = str(uuid.uuid4())
        file_path = f"uploads/{doc_id}.pdf"
        
        async with open(file_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # Create mock document info
        doc_info = DocumentInfo(
            id=doc_id,
            name=file.filename,
            title=file.filename.replace('.pdf', ''),
            outline=[
                {"level": "1", "text": "Introduction", "page": 1},
                {"level": "1", "text": "Methodology", "page": 2},
                {"level": "1", "text": "Results", "page": 3},
                {"level": "1", "text": "Conclusion", "page": 4}
            ],
            language="en",
            upload_timestamp=datetime.utcnow().isoformat()
        )
        
        # Store document info
        documents_store[doc_id] = {
            "info": doc_info.dict(),
            "file_path": file_path,
            "analysis": {
                "title": doc_info.title,
                "outline": doc_info.outline
            }
        }
        
        uploaded_docs.append(doc_info)
    
    return uploaded_docs

@app.get("/documents", response_model=List[DocumentInfo])
async def get_documents():
    """Get list of all uploaded documents."""
    return [doc["info"] for doc in documents_store.values()]

@app.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """Get specific document information."""
    if doc_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    return documents_store[doc_id]["info"]

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document."""
    if doc_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove file
    file_path = documents_store[doc_id]["file_path"]
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from store
    del documents_store[doc_id]
    
    return {"message": "Document deleted successfully"}

@app.post("/analyze-documents")
async def analyze_documents(request: AnalysisRequest):
    """Analyze documents using persona and job context."""
    # Return mock analysis result
    analysis_result = {
        "metadata": {
            "input_documents": request.document_ids,
            "persona": request.persona,
            "job_to_be_done": request.job_to_be_done,
            "processing_timestamp": datetime.utcnow().isoformat()
        },
        "extracted_sections": [
            {
                "document": "mock_document.pdf",
                "section_title": "Introduction to AI in Healthcare",
                "importance_rank": 1,
                "page_number": 1,
                "relevance_score": 0.95
            },
            {
                "document": "mock_document.pdf", 
                "section_title": "Implementation Challenges",
                "importance_rank": 2,
                "page_number": 3,
                "relevance_score": 0.88
            },
            {
                "document": "mock_document.pdf",
                "section_title": "Future Trends and Recommendations",
                "importance_rank": 3,
                "page_number": 5,
                "relevance_score": 0.82
            }
        ],
        "subsection_analysis": []
    }
    
    # Cache analysis result
    cache_key = f"{'-'.join(request.document_ids)}_{request.persona}_{request.job_to_be_done}"
    analysis_cache[cache_key] = analysis_result
    
    return analysis_result

@app.post("/related-sections")
async def get_related_sections(request: RelatedSectionsRequest):
    """Get sections related to current reading position."""
    # Return mock related sections
    related = [
        {
            "document": "mock_document.pdf",
            "section_title": "Related Section 1",
            "page_number": request.current_page + 1,
            "relevance_score": 0.85,
            "explanation": f"This section is relevant to your role as {request.persona} working on {request.job_to_be_done}."
        },
        {
            "document": "mock_document.pdf",
            "section_title": "Related Section 2", 
            "page_number": request.current_page + 2,
            "relevance_score": 0.78,
            "explanation": f"Contains complementary information that supports your {request.job_to_be_done.lower()} objectives."
        }
    ]
    
    return {"related_sections": related}

@app.post("/insights")
async def generate_insights(request: InsightsRequest):
    """Generate AI insights for current text using LLM."""
    # Return mock insights
    insights = [
        {
            "type": "takeaway",
            "content": f"This is a key insight about the content that would be relevant for a {request.persona} working on {request.job_to_be_done}."
        },
        {
            "type": "fact",
            "content": "Did you know? This content contains important information that could be valuable for your analysis."
        },
        {
            "type": "connection",
            "content": "This connects to broader concepts in the field and relates to your specific goals."
        }
    ]
    return {"insights": insights}

@app.post("/podcast")
async def generate_podcast(request: PodcastRequest):
    """Generate podcast audio for current section."""
    # Return mock podcast data
    script = f"Welcome to this AI-generated summary. Today we're discussing content that's relevant for your analysis. The main text covers important topics that connect to your goals. This podcast would normally provide detailed insights and connections to related sections. In a full implementation, you would hear a comprehensive analysis tailored to your specific needs and objectives."
    
    return {"script": script, "audio_url": "/audio/mock_audio_demo.mp3"}

@app.post("/simplify-text")
async def simplify_text(request: SimplifyTextRequest):
    """Simplify text difficulty using LLM."""
    # Return simplified text
    simplified = f"Here is a {request.difficulty_level} version of the text: {request.text[:100]}..."
    return {"simplified_text": simplified}

@app.post("/define-term")
async def define_term(request: TermDefinitionRequest):
    """Get definition for a complex term."""
    definition = f"'{request.term}' is a technical term that refers to concepts within the context of {request.context}."
    return {"definition": definition}

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """Serve generated audio files."""
    # Return a mock response for audio files
    return {"message": f"Mock audio file: {filename}"}

@app.get("/pdf/{doc_id}")
async def get_pdf(doc_id: str):
    """Serve PDF files."""
    if doc_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = documents_store[doc_id]["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(file_path, media_type="application/pdf")

@app.post("/reading-progress")
async def track_reading_progress(doc_id: str = Form(...), 
                               current_page: int = Form(...),
                               total_pages: int = Form(...),
                               time_spent: int = Form(...)):
    """Track reading progress for a document."""
    if doc_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Simple progress calculation
    progress_percentage = (current_page / total_pages) * 100
    estimated_total_time = (time_spent / current_page) * total_pages if current_page > 0 else 0
    remaining_time = estimated_total_time - time_spent
    
    return {
        "progress_percentage": progress_percentage,
        "time_spent_minutes": time_spent // 60,
        "estimated_remaining_minutes": max(0, remaining_time // 60),
        "estimated_total_minutes": estimated_total_time // 60
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "documents_count": len(documents_store),
        "services": {
            "llm": True,
            "tts": True
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)