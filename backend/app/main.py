from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import shutil
import uuid
import time
import orjson

from .services.round1a import analyze_pdf_to_outline
from .services.round1b import recommend_sections
from .services.lexicon import define_terms, simplify_text
from .services.progress import ProgressTracker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "uploads")
META_DIR = os.path.join(BASE_DIR, "data", "metadata")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI(title="DocuSense Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OutlineItem(BaseModel):
    id: str
    title: str
    level: int
    page: int
    children: Optional[List["OutlineItem"]] = None

OutlineItem.model_rebuild()

class DocumentMeta(BaseModel):
    id: str
    name: str
    path: str
    url: Optional[str] = None
    outline: List[OutlineItem] = []

class UploadResponse(BaseModel):
    documents: List[DocumentMeta]


progress = ProgressTracker(storage_path=os.path.join(META_DIR, "progress.json"))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload", response_model=UploadResponse)
async def upload_pdfs(files: List[UploadFile] = File(...)):
    docs: List[DocumentMeta] = []
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {f.filename}")
        doc_id = str(uuid.uuid4())
        dest_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{f.filename}")
        with open(dest_path, "wb") as out:
            shutil.copyfileobj(f.file, out)
        # outline via Round1A
        outline_data = analyze_pdf_to_outline(dest_path)
        outline_items: List[OutlineItem] = []
        for idx, item in enumerate(outline_data.get("outline", [])):
            outline_items.append(
                OutlineItem(
                    id=f"{idx+1}",
                    title=item.get("text") or item.get("title") or "",
                    level=int(item.get("level", "H1").replace("H", "") if isinstance(item.get("level"), str) else item.get("level", 1)),
                    page=int(item.get("page", 1)) + 1 if item.get("page", 0) == 0 else int(item.get("page", 1)),
                )
            )
        docs.append(DocumentMeta(id=doc_id, name=f.filename, path=dest_path, outline=outline_items))
    return UploadResponse(documents=docs)


@app.get("/documents")
def list_documents():
    out = []
    for fn in os.listdir(UPLOAD_DIR):
        if not fn.lower().endswith(".pdf"):
            continue
        parts = fn.split("_", 1)
        if len(parts) != 2:
            continue
        doc_id, name = parts
        outline_json_path = os.path.join(META_DIR, f"{doc_id}.outline.json")
        outline_items: List[Dict[str, Any]] = []
        if os.path.isfile(outline_json_path):
            try:
                with open(outline_json_path, "rb") as f:
                    outline_items = orjson.loads(f.read())
            except Exception:
                outline_items = []
        out.append({
            "id": doc_id,
            "name": name,
            "url": f"/pdf/{doc_id}",
            "outline": outline_items,
        })
    return {"documents": out}


@app.get("/pdf/{doc_id}")
def get_pdf(doc_id: str):
    # find file by id prefix
    for fn in os.listdir(UPLOAD_DIR):
        if fn.startswith(f"{doc_id}_") and fn.lower().endswith(".pdf"):
            return FileResponse(os.path.join(UPLOAD_DIR, fn), media_type="application/pdf")
    raise HTTPException(status_code=404, detail="Document not found")


class RecommendRequest(BaseModel):
    persona: str
    job_to_be_done: str
    doc_ids: Optional[List[str]] = None


@app.post("/recommendations")
def recommendations(req: RecommendRequest):
    # Build input.json for Round1B and run ranking in-process
    # Resolve PDF paths for doc_ids or use all
    selected = []
    for fn in os.listdir(UPLOAD_DIR):
        if not fn.lower().endswith(".pdf"):
            continue
        doc_id = fn.split("_", 1)[0]
        if req.doc_ids and doc_id not in req.doc_ids:
            continue
        selected.append(os.path.join(UPLOAD_DIR, fn))
    if not selected:
        raise HTTPException(status_code=400, detail="No documents available")

    start = time.time()
    result = recommend_sections(selected, req.persona, req.job_to_be_done)
    elapsed = time.time() - start
    return {"elapsed": elapsed, **result}


class DefineRequest(BaseModel):
    text: str


@app.post("/define")
def define(req: DefineRequest):
    return {"definitions": define_terms(req.text)}


class SimplifyRequest(BaseModel):
    text: str
    level: Optional[str] = "medium"  # easy|medium|hard


@app.post("/simplify")
def simplify(req: SimplifyRequest):
    return {"simplified": simplify_text(req.text, level=req.level)}


class ProgressEvent(BaseModel):
    document_id: str
    page: int
    seconds_on_page: int


@app.post("/progress")
def progress_event(ev: ProgressEvent):
    progress.record(ev.document_id, ev.page, ev.seconds_on_page)
    return {"ok": True}


@app.get("/progress/{document_id}")
def get_progress(document_id: str):
    return progress.get(document_id)