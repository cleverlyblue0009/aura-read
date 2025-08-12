#!/usr/bin/env python3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Test Server", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Test server is running", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Backend is working"}

if __name__ == "__main__":
    import uvicorn
    print("Starting test server on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)