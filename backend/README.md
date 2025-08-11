DocuSense Backend

Setup
- Python 3.10+
- Install deps: pip install -r requirements.txt
- Run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Key Endpoints
- GET /health
- POST /upload (multipart form) files[]: PDF(s) -> outlines via Round 1A
- GET /documents -> list documents and outlines
- GET /pdf/{doc_id} -> serve uploaded PDF by id
- POST /recommendations { persona, job_to_be_done, doc_ids? } -> sections and snippets (Round 1B)
- POST /define { text } -> definitions for complex terms
- POST /simplify { text, level? } -> simplified text
- POST /progress { document_id, page, seconds_on_page } -> track reading
- GET /progress/{document_id}