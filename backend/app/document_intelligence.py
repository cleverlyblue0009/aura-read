import os
import re
import time
from datetime import datetime
from typing import Any, Dict, List
from outline_core import extract_outline_blocks, LineBlock
import scoring

# --------------------------------------------------------------------------------------
# Build sections: heading text + concatenated body until next heading
# --------------------------------------------------------------------------------------
def build_sections_from_blocks(title_block, blocks: List[LineBlock], doc_name: str) -> List[Dict[str, Any]]:
    """
    Converts LineBlocks into logical sections for scoring.
    Each section:
      doc, heading, page, text
    """
    sections = []
    current_heading = None
    current_text: List[str] = []
    current_pages = set()

    def flush():
        nonlocal current_heading, current_text, current_pages
        if current_heading:
            sections.append({
                "doc": doc_name,
                "heading": current_heading.text,
                "page": min(current_pages) if current_pages else current_heading.page,
                "text": " ".join(current_text).strip()
            })
        current_heading = None
        current_text = []
        current_pages = set()

    for b in blocks:
        if b.tag == "TITLE":
            continue
        if b.tag == "HEADING":
            flush()
            current_heading = b
            current_text = []
            current_pages = {b.page}
        else:  # BODY
            if current_heading is not None:
                current_text.append(b.text)
                current_pages.add(b.page)
            else:
                # body text before first heading -> ignore
                pass

    flush()

    # fallback: no headings found -> whole doc
    if not sections:
        text_all = " ".join([b.text for b in blocks if b.tag != "TITLE"]).strip()
        sections.append({
            "doc": doc_name,
            "heading": doc_name,
            "page": 1,
            "text": text_all
        })

    return sections

# --------------------------------------------------------------------------------------
# Rank sections by persona+job relevance
# --------------------------------------------------------------------------------------
def rank_sections(persona: str, job: str, sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    query = scoring.build_query(persona, job)
    kw = scoring.build_keywords(persona, job)
    headings = [s["heading"] for s in sections]
    texts = [s["text"] for s in sections]
    scores = scoring.combined_scores(query, headings, texts, kw)
    for s, sc in zip(sections, scores):
        s["score"] = float(sc)
    sections.sort(key=lambda x: x["score"], reverse=True)
    for i, s in enumerate(sections, start=1):
        s["importance_rank"] = i
    return sections

# --------------------------------------------------------------------------------------
# Sub-section drilldown (snippets)
# --------------------------------------------------------------------------------------
SNIP_SPLIT_RE = re.compile(r"(?<=[\.!?])\s+|[\r\n]+|•")

def extract_subsections(section: Dict[str, Any],
                        persona: str,
                        job: str,
                        max_snips: int = 3) -> List[Dict[str, Any]]:
    """
    Break section text into candidate snippets and score them quickly
    against the persona+job query. Returns top snippets.
    """
    text = section["text"]
    if not text:
        return []

    # candidate splits
    parts = []
    for seg in SNIP_SPLIT_RE.split(text):
        seg = seg.strip()
        if not seg:
            continue
        # de-bullet
        seg = re.sub(r"^[•\-\*\u2022●◦]\s*", "", seg)
        parts.append(seg)

    if not parts:
        return []

    # score snippets using TF-IDF vs query
    query = scoring.build_query(persona, job)
    scores = scoring.tfidf_scores(query, parts)
    order = scores.argsort()[::-1]  # high->low

    out = []
    base_page = section["page"]  # cheap fallback; we don't track fine-grained snippet pages
    for idx in order[:max_snips]:
        out.append({
            "document": section["doc"],
            "refined_text": parts[idx],
            "page_number": base_page
        })
    return out

# --------------------------------------------------------------------------------------
# Main document intelligence processing
# --------------------------------------------------------------------------------------
def process_documents_intelligence(pdf_paths: List[str], 
                                   persona: str, 
                                   job: str,
                                   topk_sections: int = 20,
                                   max_snips_per_section: int = 3) -> Dict[str, Any]:
    """
    Process multiple PDFs using document intelligence to find relevant sections.
    Returns structured output with ranked sections and subsections.
    """
    start = time.time()

    # --- per-PDF section extraction ---
    all_sections: List[Dict[str, Any]] = []
    for pdf_path in pdf_paths:
        doc_name = os.path.basename(pdf_path)
        try:
            title, blocks = extract_outline_blocks(pdf_path)
        except Exception as e:
            print(f"ERROR: Failed to parse '{doc_name}': {e}")
            continue
        secs = build_sections_from_blocks(title, blocks, doc_name)
        all_sections.extend(secs)

    if not all_sections:
        return {
            "metadata": {
                "input_documents": [],
                "persona": persona,
                "job_to_be_done": job,
                "processing_timestamp": datetime.utcnow().isoformat()
            },
            "extracted_sections": [],
            "subsection_analysis": []
        }

    # --- rank sections ---
    ranked = rank_sections(persona, job, all_sections)

    # --- select top K ---
    top_sections = ranked[: min(len(ranked), topk_sections)]

    # --- sub-section analysis ---
    all_sub = []
    for sec in top_sections:
        subs = extract_subsections(sec, persona, job, max_snips=max_snips_per_section)
        all_sub.extend(subs)

    # --- output JSON (hackathon expected format) ---
    out = {
        "metadata": {
            "input_documents": [os.path.basename(p) for p in pdf_paths],
            "persona": persona,
            "job_to_be_done": job,
            "processing_timestamp": datetime.utcnow().isoformat()
        },
        "extracted_sections": [
            {
                "document": s["doc"],
                "section_title": s["heading"],
                "importance_rank": s["importance_rank"],
                "page_number": s["page"],
                "relevance_score": s["score"]
            }
            for s in top_sections
        ],
        "subsection_analysis": all_sub
    }

    elapsed = time.time() - start
    print(f"Document intelligence: processed {len(pdf_paths)} PDFs in {elapsed:.2f}s")
    
    return out

def find_related_sections(current_page: int, 
                         current_section: str,
                         persona: str,
                         job: str,
                         all_sections: List[Dict[str, Any]],
                         limit: int = 3) -> List[Dict[str, Any]]:
    """
    Find sections related to the current reading position.
    Returns top related sections with explanations.
    """
    if not all_sections:
        return []
    
    # Filter out current section and rank by relevance
    filtered_sections = [s for s in all_sections if s.get("page", 0) != current_page]
    
    if current_section:
        # Re-rank based on current section context
        query = f"{persona} {job} {current_section}"
        kw = scoring.build_keywords(persona, job) | scoring.keyword_set(current_section)
        headings = [s["heading"] for s in filtered_sections]
        texts = [s["text"] for s in filtered_sections]
        scores = scoring.combined_scores(query, headings, texts, kw)
        
        for s, sc in zip(filtered_sections, scores):
            s["contextual_score"] = float(sc)
        
        filtered_sections.sort(key=lambda x: x.get("contextual_score", 0), reverse=True)
    
    # Return top sections with explanations
    related = []
    for i, section in enumerate(filtered_sections[:limit]):
        explanation = generate_relevance_explanation(section, current_section, persona, job)
        related.append({
            "document": section["doc"],
            "section_title": section["heading"],
            "page_number": section["page"],
            "relevance_score": section.get("contextual_score", section.get("score", 0)),
            "explanation": explanation
        })
    
    return related

def generate_relevance_explanation(section: Dict[str, Any], 
                                 current_section: str,
                                 persona: str, 
                                 job: str) -> str:
    """
    Generate a brief explanation of why a section is relevant.
    """
    # Simple heuristic-based explanation generation
    section_text = section.get("text", "")
    section_title = section.get("heading", "")
    
    # Check for common keywords
    persona_keywords = scoring.keyword_set(persona)
    job_keywords = scoring.keyword_set(job)
    section_keywords = scoring.keyword_set(section_text + " " + section_title)
    
    common_persona = persona_keywords & section_keywords
    common_job = job_keywords & section_keywords
    
    if common_persona and common_job:
        return f"Contains relevant information about {', '.join(list(common_persona)[:2])} related to your {job.lower()}."
    elif common_persona:
        return f"Discusses {', '.join(list(common_persona)[:2])} which aligns with your role as {persona.lower()}."
    elif common_job:
        return f"Provides insights relevant to {', '.join(list(common_job)[:2])} for your task."
    else:
        return f"Contains complementary information that may support your understanding."