import os
import asyncio
import aiofiles
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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

# Mount static files for frontend (only if the directory exists)
frontend_dist_path = "/app/frontend/dist"
if os.path.exists(frontend_dist_path):
    # Mount static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")
    
    # Serve frontend index.html for root and SPA routes
    @app.get("/")
    async def serve_frontend_root():
        index_path = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        raise HTTPException(status_code=404, detail="Frontend not found")
    
    # Catch-all route for SPA (must be last)
    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        # Don't serve frontend for API routes
        if (full_path.startswith("api/") or 
            full_path.startswith("docs") or 
            full_path.startswith("openapi.json") or
            full_path.startswith("pdf/") or
            full_path.startswith("audio/") or
            full_path.startswith("upload") or
            full_path.startswith("health")):
            raise HTTPException(status_code=404, detail="Not found")
        
        # For all other routes, serve index.html (SPA routing)
        index_path = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        
        raise HTTPException(status_code=404, detail="Frontend not found")

# Global storage for documents and analysis results
documents_store: Dict[str, Dict[str, Any]] = {}
analysis_cache: Dict[str, Dict[str, Any]] = {}
text_selection_cache: Dict[str, Dict[str, Any]] = {}

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
    related_sections: Optional[List[Dict[str, Any]]] = None

class PodcastRequest(BaseModel):
    text: str
    related_sections: Optional[List[Dict[str, Any]]] = None
    insights: Optional[List[Dict[str, Any]]] = None
    podcast_style: str = "single"  # "single" or "conversation"

class SimplifyTextRequest(BaseModel):
    text: str
    difficulty_level: str = "simple"  # simple, moderate, advanced

class TermDefinitionRequest(BaseModel):
    term: str
    context: str

class TextSelectionRequest(BaseModel):
    selected_text: str
    document_id: str
    page_number: int
    document_ids: List[str]  # All available documents to search in
    persona: str = "researcher"
    job_to_be_done: str = "analyze documents"

# Initialize services
llm_service = LLMService()
tts_service = TTSService()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("audio_cache", exist_ok=True)
    
    # Log environment configuration for debugging
    print("DocuSense API started successfully")
    print(f"LLM Provider: {os.getenv('LLM_PROVIDER', 'gemini')}")
    print(f"TTS Provider: {os.getenv('TTS_PROVIDER', 'azure')}")
    print(f"Adobe Embed API Key: {'configured' if os.getenv('ADOBE_EMBED_API_KEY') else 'not configured'}")
    print(f"Frontend path: {'/app/frontend/dist' if os.path.exists('/app/frontend/dist') else 'not found'}")

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
    """Generate AI insights for current text using LLM with cross-document analysis."""
    try:
        insights = await llm_service.generate_insights(
            text=request.text,
            persona=request.persona,
            job_to_be_done=request.job_to_be_done,
            context=request.document_context,
            related_sections=request.related_sections
        )
        return {"insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")

@app.post("/podcast")
async def generate_podcast(request: PodcastRequest):
    """Generate enhanced 2-5 minute podcast audio for current section."""
    try:
        # Convert related sections and insights to text format
        related_sections_text = []
        if request.related_sections:
            for section in request.related_sections[:3]:
                section_text = f"From '{section.get('doc_name', 'Unknown')}': {section.get('snippet', '')}"
                related_sections_text.append(section_text)
        
        insights_text = []
        if request.insights:
            for insight in request.insights[:4]:
                insights_text.append(insight.get('content', ''))
        
        # Generate script using enhanced LLM
        script = await llm_service.generate_podcast_script(
            text=request.text,
            related_sections=related_sections_text,
            insights=insights_text,
            podcast_style=request.podcast_style
        )
        
        # Generate audio using TTS with enhanced processing
        audio_file = await tts_service.generate_audio(script)
        
        if audio_file:
            return {
                "script": script, 
                "audio_url": f"/audio/{audio_file}",
                "style": request.podcast_style,
                "duration_estimate": f"{len(script.split()) // 3}-{len(script.split()) // 2} minutes"
            }
        else:
            # Return script even if audio generation fails
            return {
                "script": script,
                "audio_url": None,
                "style": request.podcast_style,
                "error": "Audio generation failed, but script is available"
            }
            
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

@app.post("/text-selection")
async def handle_text_selection(request: TextSelectionRequest):
    """Handle text selection and return related sections with snippets with caching."""
    
    # Create cache key for this request
    cache_key = f"{hash(request.selected_text)}_{hash('_'.join(sorted(request.document_ids)))}"
    
    # Check cache first
    if cache_key in text_selection_cache:
        cached_result = text_selection_cache[cache_key]
        # Return cached result if it's less than 5 minutes old
        if (datetime.utcnow().timestamp() - cached_result["timestamp"]) < 300:
            return cached_result["data"]
    
    try:
        # Get all document sections for searching (optimized)
        all_sections = []
        for doc_id in request.document_ids:
            if doc_id not in documents_store:
                continue
            
            doc_analysis = documents_store[doc_id]["analysis"]
            doc_name = documents_store[doc_id]["info"]["name"]
            
            # Extract sections from the document (only if they have sufficient content)
            if "sections" in doc_analysis:
                for section in doc_analysis["sections"]:
                    section_text = section.get("text", "")
                    if len(section_text) >= 50:  # Only include substantial sections
                        all_sections.append({
                            "doc_id": doc_id,
                            "doc_name": doc_name,
                            "heading": section.get("heading", ""),
                            "text": section_text,
                            "page": section.get("page", 1),
                            "start_page": section.get("start_page", section.get("page", 1)),
                            "end_page": section.get("end_page", section.get("page", 1)),
                            "confidence": section.get("confidence", 0.5),
                            "level": section.get("level", 1)
                        })
        
        # Early return if no sections found
        if not all_sections:
            result = {
                "selected_text": request.selected_text,
                "related_sections": []
            }
            return result
        
        # Find related sections using optimized semantic similarity
        related_sections = find_related_sections_for_text(
            selected_text=request.selected_text,
            all_sections=all_sections,
            persona=request.persona,
            job=request.job_to_be_done,
            limit=5
        )
        
        # Generate snippets for each related section (parallel processing)
        import asyncio
        
        async def process_section(section):
            snippet = generate_snippet(section["text"], request.selected_text)
            return {
                "doc_id": section["doc_id"],
                "doc_name": section["doc_name"],
                "heading": section["heading"],
                "snippet": snippet,
                "page": section["page"],
                "start_page": section["start_page"],
                "end_page": section["end_page"],
                "relevance_score": section.get("relevance_score", 0.5),
                "section_type": classify_section_relationship(request.selected_text, section["text"])
            }
        
        # Process sections in parallel for better performance
        if related_sections:
            sections_with_snippets = await asyncio.gather(*[
                asyncio.create_task(process_section(section)) 
                for section in related_sections
            ])
        else:
            sections_with_snippets = []
        
        result = {
            "selected_text": request.selected_text,
            "related_sections": sections_with_snippets
        }
        
        # Cache the result
        text_selection_cache[cache_key] = {
            "data": result,
            "timestamp": datetime.utcnow().timestamp()
        }
        
        # Limit cache size
        if len(text_selection_cache) > 100:
            # Remove oldest entries
            sorted_cache = sorted(text_selection_cache.items(), key=lambda x: x[1]["timestamp"])
            for old_key, _ in sorted_cache[:20]:  # Remove 20 oldest
                del text_selection_cache[old_key]
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text selection processing failed: {str(e)}")

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

@app.get("/navigate/{doc_id}/{page}")
async def navigate_to_page(doc_id: str, page: int):
    """Get navigation information for jumping to a specific page in a document."""
    if doc_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_info = documents_store[doc_id]["info"]
    
    return {
        "doc_id": doc_id,
        "doc_name": doc_info["name"],
        "target_page": page,
        "pdf_url": f"/pdf/{doc_id}",
        "outline": doc_info.get("outline", [])
    }

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

@app.get("/config")
async def get_config():
    """Get frontend configuration."""
    return {
        "adobe_embed_api_key": os.getenv("ADOBE_EMBED_API_KEY"),
        "api_base_url": os.getenv("API_BASE_URL", "http://localhost:8080")
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

# Cache for TF-IDF vectorizer and processed sections
from functools import lru_cache
import hashlib

# Global cache for vectorizers and section embeddings
vectorizer_cache = {}
section_embeddings_cache = {}

# Helper functions for text selection with performance optimization
def find_related_sections_for_text(selected_text: str, all_sections: List[Dict], persona: str, job: str, limit: int = 5):
    """Find sections related to the selected text using optimized TF-IDF similarity with caching."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    
    if not all_sections:
        return []
    
    # Create cache key for sections
    sections_hash = hashlib.md5(str([s.get("text", "")[:100] for s in all_sections]).encode()).hexdigest()
    cache_key = f"sections_{sections_hash}"
    
    # Check if we have cached embeddings for these sections
    if cache_key in section_embeddings_cache:
        vectorizer, section_vectors = section_embeddings_cache[cache_key]
    else:
        # Prepare texts for similarity comparison
        section_texts = [section["text"] for section in all_sections]
        
        # Create and fit vectorizer
        vectorizer = TfidfVectorizer(
            stop_words='english', 
            max_features=500,  # Reduced for better performance
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.95
        )
        
        # Fit on section texts only
        section_vectors = vectorizer.fit_transform(section_texts)
        
        # Cache the results
        section_embeddings_cache[cache_key] = (vectorizer, section_vectors)
        
        # Limit cache size
        if len(section_embeddings_cache) > 10:
            # Remove oldest entry
            oldest_key = next(iter(section_embeddings_cache))
            del section_embeddings_cache[oldest_key]
    
    # Transform selected text using cached vectorizer
    try:
        selected_vector = vectorizer.transform([selected_text])
    except ValueError:
        # Fallback if selected text has no known words
        return all_sections[:limit]
    
    # Calculate cosine similarities
    similarities = cosine_similarity(selected_vector, section_vectors).flatten()
    
    # Add relevance scores to sections with minimum threshold
    min_relevance = 0.1
    filtered_sections = []
    for i, section in enumerate(all_sections):
        relevance = float(similarities[i])
        if relevance >= min_relevance:
            section = section.copy()  # Don't modify original
            section["relevance_score"] = relevance
            filtered_sections.append(section)
    
    # Sort by relevance and return top results
    sorted_sections = sorted(filtered_sections, key=lambda x: x["relevance_score"], reverse=True)
    return sorted_sections[:limit]

@lru_cache(maxsize=1000)
def generate_snippet(full_text: str, selected_text: str, max_length: int = 200):
    """Generate a snippet from full text highlighting relevance to selected text with caching."""
    import re
    
    # Early return for short texts
    if len(full_text) <= max_length:
        return full_text
    
    # Split into sentences (optimized regex)
    sentences = re.split(r'[.!?]+', full_text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s) > 10]
    
    if not sentences:
        return full_text[:max_length] + "..." if len(full_text) > max_length else full_text
    
    # Find the most relevant sentence by keyword overlap (optimized)
    selected_words = set(word.lower() for word in selected_text.split() if len(word) > 2)
    best_sentence_idx = 0
    best_overlap = 0
    
    for i, sentence in enumerate(sentences[:20]):  # Limit search to first 20 sentences
        sentence_words = set(word.lower() for word in sentence.split() if len(word) > 2)
        overlap = len(selected_words.intersection(sentence_words))
        if overlap > best_overlap:
            best_overlap = overlap
            best_sentence_idx = i
    
    # Create snippet around the best sentence
    context_size = 1 if len(sentences) > 10 else 0
    start_idx = max(0, best_sentence_idx - context_size)
    end_idx = min(len(sentences), best_sentence_idx + context_size + 1)
    
    snippet = ". ".join(sentences[start_idx:end_idx])
    
    # Trim if too long
    if len(snippet) > max_length:
        # Try to break at sentence boundary
        truncated = snippet[:max_length]
        last_period = truncated.rfind('.')
        if last_period > max_length // 2:
            snippet = truncated[:last_period + 1]
        else:
            snippet = truncated + "..."
    
    return snippet

def classify_section_relationship(selected_text: str, section_text: str):
    """Classify the relationship between selected text and section."""
    selected_lower = selected_text.lower()
    section_lower = section_text.lower()
    
    # Simple keyword-based classification
    if any(word in section_lower for word in ["however", "but", "contrary", "opposite", "disagree"]):
        return "contradiction"
    elif any(word in section_lower for word in ["example", "instance", "case", "illustration"]):
        return "example"
    elif any(word in section_lower for word in ["similar", "likewise", "also", "additionally"]):
        return "supporting"
    elif any(word in section_lower for word in ["extend", "build", "expand", "further"]):
        return "extension"
    else:
        return "related"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)