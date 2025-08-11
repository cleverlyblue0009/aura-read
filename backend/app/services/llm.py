import os
import time
from typing import List, Dict, Any, Optional
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
AZURE_TTS_KEY = os.environ.get("AZURE_TTS_KEY")
AZURE_TTS_REGION = os.environ.get("AZURE_TTS_REGION")


def generate_insights(context_text: str, persona: str, job: str, max_items: int = 6) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        return {
            "enabled": False,
            "reason": "GEMINI_API_KEY not set",
            "insights": []
        }
    # Gemini 1.5 Flash via REST
    # Note: This is a minimal illustrative call; prompt tuned for concise insights
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
    headers = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}
    prompt = f"""
You are an assistant generating brief reading insights.
Persona: {persona}
Goal: {job}
Context:
{context_text[:8000]}

Return JSON with an array 'items' of at most {max_items} objects with fields:
- type: one of [key-insight, fact, contradiction, inspiration]
- title: short title
- content: 1-2 sentence explanation
- relevance: 0.0-1.0
"""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    # naive parse: try to extract JSON from model text
    text = ""
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        pass
    import json
    items: List[Dict[str, Any]] = []
    if text:
        try:
            j = json.loads(text)
            items = j.get("items", [])
        except Exception:
            # fallback: single key insight
            items = [{
                "type": "key-insight",
                "title": "Insight",
                "content": text[:400],
                "relevance": 0.8
            }]
    return {"enabled": True, "insights": items}


def synthesize_podcast(script_text: str, voice: str = "en-US-JennyNeural") -> Dict[str, Any]:
    if not (AZURE_TTS_KEY and AZURE_TTS_REGION):
        return {
            "enabled": False,
            "reason": "AZURE_TTS_KEY/AZURE_TTS_REGION not set",
            "audio_url": None
        }
    # Azure TTS REST
    tts_url = f"https://{AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_TTS_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3"
    }
    ssml = f"""
<speak version='1.0' xml:lang='en-US'>
  <voice name='{voice}'>
    {script_text}
  </voice>
</speak>
"""
    resp = requests.post(tts_url, headers=headers, data=ssml.encode("utf-8"), timeout=60)
    resp.raise_for_status()
    # store audio to outputs
    from .util_paths import OUTPUT_DIR
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    fname = f"podcast_{int(time.time()*1000)}.mp3"
    fpath = os.path.join(OUTPUT_DIR, fname)
    with open(fpath, "wb") as f:
        f.write(resp.content)
    return {"enabled": True, "audio_file": fpath, "filename": fname}