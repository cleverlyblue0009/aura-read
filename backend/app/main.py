import os
import asyncio
import aiofiles
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import json

# Local imports
from .pdf_analyzer import analyze_pdf, extract_full_text
from .document_intelligence import process_documents_intelligence, find_related_sections
from .llm_services import LLMService
from .tts_service import TTSService

app = FastAPI(title="DocuSense API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],  # Adjust for your frontend
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
    difficulty_level: str = "simple"  # simple, moderate, advanced

class TermDefinitionRequest(BaseModel):
    term: str
    context: str

# Initialize services
llm_service = LLMService()
tts_service = TTSService()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("audio_cache", exist_ok=True)
    print("DocuSense API started successfully")

@app.get("/")
async def root():
    return {"message": "DocuSense API is running", "version": "1.0.0"}

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
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Analyze PDF
        try:
            analysis = analyze_pdf(file_path)
            
            doc_info = DocumentInfo(
                id=doc_id,
                name=file.filename,
                title=analysis["title"] or file.filename,
                outline=analysis["outline"],
                language=analysis.get("language", "unknown"),
                upload_timestamp=datetime.utcnow().isoformat()
            )
            
            # Store document info and analysis
            documents_store[doc_id] = {
                "info": doc_info.dict(),
                "file_path": file_path,
                "analysis": analysis
            }
            
            uploaded_docs.append(doc_info)
            
        except Exception as e:
            print(f"Error analyzing {file.filename}: {e}")
            # Clean up failed upload
            if os.path.exists(file_path):
                os.remove(file_path)
            continue
    
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
    # Validate document IDs
    pdf_paths = []
    for doc_id in request.document_ids:
        if doc_id not in documents_store:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
        pdf_paths.append(documents_store[doc_id]["file_path"])
    
    # Process with document intelligence
    try:
        analysis_result = process_documents_intelligence(
            pdf_paths=pdf_paths,
            persona=request.persona,
            job=request.job_to_be_done,
            topk_sections=20,
            max_snips_per_section=3
        )
        
        # Cache analysis result
        cache_key = f"{'-'.join(request.document_ids)}_{request.persona}_{request.job_to_be_done}"
        analysis_cache[cache_key] = analysis_result
        
        return analysis_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/related-sections")
async def get_related_sections(request: RelatedSectionsRequest):
    """Get sections related to current reading position."""
    # Find cached analysis or run new analysis
    cache_key = f"{'-'.join(request.document_ids)}_{request.persona}_{request.job_to_be_done}"
    
    if cache_key not in analysis_cache:
        # Run analysis first
        pdf_paths = []
        for doc_id in request.document_ids:
            if doc_id not in documents_store:
                raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
            pdf_paths.append(documents_store[doc_id]["file_path"])
        
        analysis_result = process_documents_intelligence(
            pdf_paths=pdf_paths,
            persona=request.persona,
            job=request.job_to_be_done
        )
        analysis_cache[cache_key] = analysis_result
    
    analysis_result = analysis_cache[cache_key]
    all_sections = analysis_result.get("extracted_sections", [])
    
    # Find related sections
    related = find_related_sections(
        current_page=request.current_page,
        current_section=request.current_section,
        persona=request.persona,
        job=request.job_to_be_done,
        all_sections=all_sections,
        limit=3
    )
    
    return {"related_sections": related}

@app.post("/insights")
async def generate_insights(request: InsightsRequest):
    """Generate AI insights for current text using LLM."""
    try:
        insights = await llm_service.generate_insights(
            text=request.text,
            persona=request.persona,
            job=request.job_to_be_done,
            context=request.document_context
        )
        return {"insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")

@app.post("/podcast")
async def generate_podcast(request: PodcastRequest):
    """Generate podcast audio for current section."""
    try:
        # Generate script using LLM
        script = await llm_service.generate_podcast_script(
            text=request.text,
            related_sections=request.related_sections,
            insights=request.insights
        )
        
        # Generate audio using TTS
        audio_file = await tts_service.generate_audio(script)
        
        return {"script": script, "audio_url": f"/audio/{audio_file}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Podcast generation failed: {str(e)}")

@app.post("/simplify-text")
async def simplify_text(request: SimplifyTextRequest):
    """Simplify text difficulty using LLM."""
    try:
        simplified = await llm_service.simplify_text(
            text=request.text,
            difficulty_level=request.difficulty_level
        )
        return {"simplified_text": simplified}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text simplification failed: {str(e)}")

@app.post("/define-term")
async def define_term(request: TermDefinitionRequest):
    """Get definition for a complex term."""
    try:
        definition = await llm_service.define_term(
            term=request.term,
            context=request.context
        )
        return {"definition": definition}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Term definition failed: {str(e)}")

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """Serve generated audio files."""
    file_path = f"audio_cache/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/mpeg")

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
            "llm": llm_service.is_available(),
            "tts": tts_service.is_available()
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)