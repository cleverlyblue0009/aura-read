import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import json

app = FastAPI(title="DocuSense API (Simplified)", version="1.0.0")

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

# Pydantic models
class DocumentInfo(BaseModel):
    id: str
    name: str
    title: str
    outline: List[Dict[str, Any]]
    language: str
    upload_timestamp: str

class RelatedSection(BaseModel):
    document: str
    section_title: str
    page_number: int
    relevance_score: float
    explanation: str

class Insight(BaseModel):
    type: str
    content: str

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
    print("DocuSense API (Simplified) started successfully")

@app.get("/")
async def root():
    return {"message": "DocuSense API (Simplified) is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

@app.post("/upload-pdfs", response_model=List[DocumentInfo])
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """Upload and process multiple PDF files (simplified version)."""
    uploaded_docs = []
    
    for file in files:
        if not file.filename.endswith('.pdf'):
            continue
            
        # Generate unique ID and save file
        doc_id = str(uuid.uuid4())
        file_path = f"uploads/{doc_id}.pdf"
        
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create mock outline data
        mock_outline = [
            {"level": "H1", "text": "Introduction", "page": 1},
            {"level": "H2", "text": "Overview", "page": 2},
            {"level": "H2", "text": "Key Concepts", "page": 4},
            {"level": "H1", "text": "Main Content", "page": 6},
            {"level": "H2", "text": "Analysis", "page": 8},
            {"level": "H2", "text": "Results", "page": 12},
            {"level": "H1", "text": "Conclusion", "page": 15}
        ]
        
        # Create document info
        doc_info = {
            "id": doc_id,
            "name": file.filename,
            "title": file.filename.replace('.pdf', ''),
            "outline": mock_outline,
            "language": "en",
            "upload_timestamp": datetime.now().isoformat(),
            "file_path": file_path
        }
        
        # Store document info
        documents_store[doc_id] = doc_info
        
        uploaded_docs.append(DocumentInfo(**doc_info))
    
    return uploaded_docs

@app.get("/documents", response_model=List[DocumentInfo])
async def get_documents():
    """Get all uploaded documents."""
    return [DocumentInfo(**doc) for doc in documents_store.values()]

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document."""
    if doc_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove file if it exists
    doc_info = documents_store[doc_id]
    if os.path.exists(doc_info["file_path"]):
        os.remove(doc_info["file_path"])
    
    # Remove from store
    del documents_store[doc_id]
    
    return {"message": "Document deleted successfully"}

@app.get("/pdf/{doc_id}")
async def serve_pdf(doc_id: str):
    """Serve PDF file."""
    if doc_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_info = documents_store[doc_id]
    file_path = doc_info["file_path"]
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=doc_info["name"]
    )

@app.post("/related-sections")
async def get_related_sections(request: RelatedSectionsRequest):
    """Get related sections (mock implementation)."""
    # Mock related sections based on the request
    mock_sections = [
        RelatedSection(
            document=request.document_ids[0] if request.document_ids else "mock-doc",
            section_title=f"Related to {request.current_section} - Key Points",
            page_number=request.current_page + 1,
            relevance_score=0.92,
            explanation=f"This section is highly relevant to your role as {request.persona} working on {request.job_to_be_done}"
        ),
        RelatedSection(
            document=request.document_ids[0] if request.document_ids else "mock-doc",
            section_title=f"Supporting Evidence for {request.current_section}",
            page_number=request.current_page + 3,
            relevance_score=0.87,
            explanation=f"Provides supporting evidence that aligns with your {request.job_to_be_done} objectives"
        ),
        RelatedSection(
            document=request.document_ids[0] if request.document_ids else "mock-doc",
            section_title=f"Implications and Next Steps",
            page_number=request.current_page + 5,
            relevance_score=0.83,
            explanation=f"Discusses implications relevant to {request.persona} in the context of {request.job_to_be_done}"
        )
    ]
    
    return {"related_sections": mock_sections}

@app.post("/insights")
async def generate_insights(request: InsightsRequest):
    """Generate insights (mock implementation)."""
    # Mock insights based on the request
    mock_insights = [
        Insight(
            type="takeaway",
            content=f"Key takeaway for {request.persona}: {request.text[:100]}... This is particularly relevant for your {request.job_to_be_done} work."
        ),
        Insight(
            type="connection",
            content=f"This content connects to broader themes in {request.job_to_be_done}. Consider how this impacts your decision-making process as {request.persona}."
        ),
        Insight(
            type="fact",
            content=f"Important fact: The information presented here provides concrete data points valuable for {request.persona} roles in {request.job_to_be_done}."
        )
    ]
    
    return {"insights": mock_insights}

@app.post("/podcast")
async def generate_podcast(request: PodcastRequest):
    """Generate podcast (mock implementation)."""
    # Create a mock podcast script
    script = f"""
    Welcome to your AI-generated podcast summary.
    
    Today we're discussing: {request.text[:200]}...
    
    Key insights include: {'. '.join(request.insights[:2]) if request.insights else 'Important analysis points from your document.'}
    
    Related sections cover: {', '.join(request.related_sections[:2]) if request.related_sections else 'Additional relevant topics.'}
    
    This concludes your personalized podcast summary. Thank you for listening!
    """
    
    # Mock audio URL (would be real audio file in production)
    audio_filename = f"podcast_{uuid.uuid4().hex[:8]}.mp3"
    
    return {
        "script": script.strip(),
        "audio_url": f"/audio/{audio_filename}"
    }

@app.post("/simplify-text")
async def simplify_text(request: SimplifyTextRequest):
    """Simplify text (mock implementation)."""
    # Mock text simplification
    simplified = f"Simplified version ({request.difficulty_level} level): {request.text[:100]}... [This would be the simplified version of your text]"
    
    return {"simplified_text": simplified}

@app.post("/define-term")
async def define_term(request: TermDefinitionRequest):
    """Define a term (mock implementation)."""
    # Mock term definition
    definition = f"Definition of '{request.term}': In the context of '{request.context[:50]}...', this term refers to [detailed explanation would go here]."
    
    return {"definition": definition}

@app.get("/audio/{filename}")
async def serve_audio(filename: str):
    """Serve audio file (mock implementation)."""
    # In a real implementation, this would serve actual audio files
    raise HTTPException(status_code=404, detail="Audio file not found - this is a mock implementation")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)