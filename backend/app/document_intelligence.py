import os
import re
import time
from datetime import datetime
from typing import Any, Dict, List
from .outline_core import extract_outline_blocks, LineBlock
from . import scoring

# --------------------------------------------------------------------------------------
# Enhanced section building with improved heading detection
# --------------------------------------------------------------------------------------
def build_sections_from_blocks(title_block, blocks: List[LineBlock], doc_name: str) -> List[Dict[str, Any]]:
    """
    Converts LineBlocks into logical sections for scoring with improved accuracy.
    Each section includes: doc, heading, page, text, level, word_count, and confidence
    """
    sections = []
    current_heading = None
    current_text: List[str] = []
    current_pages = set()
    current_level = 0

    def calculate_section_confidence(heading_text: str, body_text: str) -> float:
        """Calculate confidence score for section relevance based on content quality."""
        confidence = 0.5  # Base confidence
        
        # Boost for longer, more substantial content
        word_count = len(body_text.split())
        if word_count > 100:
            confidence += 0.2
        elif word_count > 50:
            confidence += 0.1
        
        # Boost for headings with meaningful keywords
        meaningful_keywords = ['introduction', 'overview', 'analysis', 'results', 'conclusion', 
                              'methodology', 'findings', 'discussion', 'summary', 'abstract',
                              'background', 'literature', 'research', 'study', 'approach']
        
        heading_lower = heading_text.lower()
        for keyword in meaningful_keywords:
            if keyword in heading_lower:
                confidence += 0.15
                break
        
        # Penalty for very short or generic headings
        if len(heading_text.split()) < 2:
            confidence -= 0.1
        
        # Boost for structured content (contains lists, numbers, etc.)
        if re.search(r'[•\-\*]\s|\d+\.|[A-Z]\)', body_text):
            confidence += 0.1
        
        return min(1.0, max(0.1, confidence))

    def flush():
        nonlocal current_heading, current_text, current_pages, current_level
        if current_heading:
            body_text = " ".join(current_text).strip()
            confidence = calculate_section_confidence(current_heading.text, body_text)
            
            sections.append({
                "doc": doc_name,
                "heading": current_heading.text,
                "page": min(current_pages) if current_pages else current_heading.page,
                "text": body_text,
                "level": current_level,
                "word_count": len(body_text.split()),
                "confidence": confidence,
                "start_page": min(current_pages) if current_pages else current_heading.page,
                "end_page": max(current_pages) if current_pages else current_heading.page
            })
        current_heading = None
        current_text = []
        current_pages = set()
        current_level = 0

    # Improved heading level detection
    for b in blocks:
        if b.tag == "TITLE":
            continue
        if b.tag == "HEADING":
            flush()
            current_heading = b
            current_text = []
            current_pages = {b.page}
            
            # Estimate heading level based on text characteristics
            heading_text = b.text.strip()
            if any(word in heading_text.lower() for word in ['abstract', 'introduction', 'conclusion']):
                current_level = 1
            elif len(heading_text.split()) <= 3 and heading_text.isupper():
                current_level = 1
            elif re.match(r'^\d+\.?\s', heading_text):
                current_level = 2
            elif re.match(r'^\d+\.\d+', heading_text):
                current_level = 3
            else:
                current_level = 2  # Default to level 2
                
        else:  # BODY
            if current_heading is not None:
                current_text.append(b.text)
                current_pages.add(b.page)
            else:
                # body text before first heading -> create implicit section
                if b.text.strip():
                    sections.append({
                        "doc": doc_name,
                        "heading": "Document Introduction",
                        "page": b.page,
                        "text": b.text.strip(),
                        "level": 1,
                        "word_count": len(b.text.split()),
                        "confidence": 0.7,
                        "start_page": b.page,
                        "end_page": b.page
                    })

    flush()

    # Enhanced fallback: no headings found -> create intelligent sections
    if not sections:
        text_all = " ".join([b.text for b in blocks if b.tag != "TITLE"]).strip()
        
        # Try to split into logical sections based on content
        paragraphs = re.split(r'\n\s*\n', text_all)
        if len(paragraphs) > 1:
            for i, para in enumerate(paragraphs):
                if para.strip() and len(para.split()) > 10:
                    # Extract first sentence as heading
                    sentences = re.split(r'[.!?]', para)
                    heading = sentences[0][:100] + "..." if len(sentences[0]) > 100 else sentences[0]
                    
                    sections.append({
                        "doc": doc_name,
                        "heading": heading or f"Section {i+1}",
                        "page": 1,
                        "text": para.strip(),
                        "level": 2,
                        "word_count": len(para.split()),
                        "confidence": 0.6,
                        "start_page": 1,
                        "end_page": 1
                    })
        else:
            sections.append({
                "doc": doc_name,
                "heading": doc_name,
                "page": 1,
                "text": text_all,
                "level": 1,
                "word_count": len(text_all.split()),
                "confidence": 0.5,
                "start_page": 1,
                "end_page": 1
            })

    return sections

# --------------------------------------------------------------------------------------
# Enhanced section ranking with improved relevance scoring
# --------------------------------------------------------------------------------------
def rank_sections(persona: str, job: str, sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enhanced ranking with multi-factor scoring for better accuracy."""
    query = scoring.build_query(persona, job)
    kw = scoring.build_keywords(persona, job)
    headings = [s["heading"] for s in sections]
    texts = [s["text"] for s in sections]
    
    # Get base scores
    base_scores = scoring.combined_scores(query, headings, texts, kw)
    
    # Apply enhanced scoring factors
    for s, base_score in zip(sections, base_scores):
        enhanced_score = float(base_score)
        
        # Factor in section confidence
        enhanced_score *= s.get("confidence", 0.5)
        
        # Boost for substantial content
        word_count = s.get("word_count", 0)
        if word_count > 200:
            enhanced_score *= 1.2
        elif word_count > 100:
            enhanced_score *= 1.1
        elif word_count < 25:
            enhanced_score *= 0.8
        
        # Boost for higher-level sections (more important)
        level = s.get("level", 2)
        if level == 1:
            enhanced_score *= 1.15
        elif level == 3:
            enhanced_score *= 0.95
        
        # Persona-specific boosts
        heading_lower = s["heading"].lower()
        text_lower = s["text"].lower()
        
        if persona.lower() in ["researcher", "academic", "scientist"]:
            research_keywords = ["methodology", "analysis", "results", "findings", "research", "study"]
            if any(kw in heading_lower or kw in text_lower for kw in research_keywords):
                enhanced_score *= 1.25
                
        elif persona.lower() in ["manager", "executive", "leader"]:
            business_keywords = ["summary", "overview", "conclusion", "recommendations", "strategy"]
            if any(kw in heading_lower or kw in text_lower for kw in business_keywords):
                enhanced_score *= 1.25
                
        elif persona.lower() in ["student", "learner"]:
            learning_keywords = ["introduction", "background", "basics", "overview", "fundamentals"]
            if any(kw in heading_lower or kw in text_lower for kw in learning_keywords):
                enhanced_score *= 1.25
        
        s["score"] = enhanced_score
        s["base_score"] = float(base_score)
    
    # Sort by enhanced score
    sections.sort(key=lambda x: x["score"], reverse=True)
    
    # Add ranking information
    for i, s in enumerate(sections, start=1):
        s["importance_rank"] = i
        s["relevance_percentile"] = max(0.1, min(1.0, s["score"]))
    
    return sections

# --------------------------------------------------------------------------------------
# Enhanced sub-section extraction with better snippet selection
# --------------------------------------------------------------------------------------
SNIP_SPLIT_RE = re.compile(r"(?<=[\.!?])\s+|[\r\n]+|•")

def extract_subsections(section: Dict[str, Any],
                        persona: str,
                        job: str,
                        max_snips: int = 3) -> List[Dict[str, Any]]:
    """
    Break section text into candidate snippets and score them with enhanced accuracy.
    Returns top snippets with relevance scores and context information.
    """
    text = section["text"]
    if not text:
        return []

    # Enhanced candidate splits with better boundaries
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
                         limit: int = 5) -> List[Dict[str, Any]]:
    """
    Find sections related to the current reading position with enhanced accuracy.
    Uses semantic similarity + persona context + content analysis.
    """
    if not all_sections:
        return []
    
    # Enhanced filtering - exclude current page range, not just exact page
    filtered_sections = []
    for s in all_sections:
        section_page = s.get("page", 0)
        start_page = s.get("start_page", section_page)
        end_page = s.get("end_page", section_page)
        
        # Exclude sections that overlap with current page
        if not (start_page <= current_page <= end_page):
            filtered_sections.append(s)
    
    if not filtered_sections:
        return []
    
    # Enhanced contextual scoring
    query = scoring.build_query(persona, job)
    if current_section:
        query += f" {current_section}"
    
    kw = scoring.build_keywords(persona, job)
    if current_section:
        kw = kw | scoring.keyword_set(current_section)
    
    headings = [s["heading"] for s in filtered_sections]
    texts = [s["text"] for s in filtered_sections]
    base_scores = scoring.combined_scores(query, headings, texts, kw)
    
    # Enhanced scoring with multiple factors
    enhanced_candidates = []
    for section, base_score in zip(filtered_sections, base_scores):
        # Base relevance score
        enhanced_score = float(base_score)
        
        # Content quality factors
        confidence = section.get("confidence", 0.5)
        word_count = section.get("word_count", 0)
        level = section.get("level", 2)
        
        # Apply multipliers
        enhanced_score *= confidence  # Quality boost
        
        # Length boost (substantial content is more valuable)
        if word_count > 200:
            enhanced_score *= 1.2
        elif word_count > 100:
            enhanced_score *= 1.1
        elif word_count < 50:
            enhanced_score *= 0.9
        
        # Level importance
        if level == 1:
            enhanced_score *= 1.15  # Major sections more important
        elif level == 3:
            enhanced_score *= 0.95  # Subsections less important
        
        # Proximity bonus (sections closer to current page are slightly more relevant)
        page_distance = abs(section.get("page", 1) - current_page)
        proximity_factor = max(0.8, 1.0 - page_distance / 20.0)
        enhanced_score *= proximity_factor
        
        # Persona-specific relevance boosts
        section_content = (section["heading"] + " " + section["text"]).lower()
        
        if persona.lower() in ["researcher", "academic", "scientist"]:
            if any(kw in section_content for kw in ["methodology", "analysis", "results", "findings", "research", "study", "data"]):
                enhanced_score *= 1.3
        elif persona.lower() in ["manager", "executive", "leader"]:
            if any(kw in section_content for kw in ["summary", "overview", "conclusion", "recommendations", "strategy", "decision"]):
                enhanced_score *= 1.3
        elif persona.lower() in ["student", "learner"]:
            if any(kw in section_content for kw in ["introduction", "background", "basics", "overview", "fundamentals", "example"]):
                enhanced_score *= 1.3
        
        enhanced_candidates.append({
            "section": section,
            "enhanced_score": enhanced_score,
            "base_score": base_score,
            "confidence": confidence,
            "word_count": word_count,
            "level": level,
            "page_distance": page_distance
        })
    
    # Sort by enhanced score
    enhanced_candidates.sort(key=lambda x: x["enhanced_score"], reverse=True)
    
    # Filter for minimum quality threshold
    quality_threshold = 0.3
    high_quality_candidates = [c for c in enhanced_candidates if c["enhanced_score"] >= quality_threshold]
    
    # Use high quality if we have enough, otherwise use top candidates
    final_candidates = high_quality_candidates if len(high_quality_candidates) >= limit else enhanced_candidates
    
    # Build enhanced results
    related = []
    for candidate in final_candidates[:limit]:
        section = candidate["section"]
        explanation = generate_enhanced_explanation(
            section, current_section, persona, job, 
            candidate["enhanced_score"], candidate["confidence"]
        )
        
        related.append({
            "document": section["doc"],
            "section_title": section["heading"],
            "page_number": section["page"],
            "relevance_score": min(1.0, candidate["enhanced_score"]),  # Cap at 1.0
            "explanation": explanation,
            "confidence": candidate["confidence"],
            "word_count": candidate["word_count"],
            "level": candidate["level"],
            "start_page": section.get("start_page", section["page"]),
            "end_page": section.get("end_page", section["page"])
        })
    
    return related

def generate_enhanced_explanation(section: Dict[str, Any], 
                                current_section: str,
                                persona: str, 
                                job: str,
                                relevance_score: float,
                                confidence: float) -> str:
    """
    Generate an intelligent explanation of why a section is relevant.
    """
    section_text = section.get("text", "")
    section_title = section.get("heading", "")
    level = section.get("level", 2)
    word_count = section.get("word_count", 0)
    
    # Build explanation components
    explanation_parts = []
    
    # Relevance quality indicator
    if relevance_score >= 0.8:
        explanation_parts.append("Highly relevant")
    elif relevance_score >= 0.6:
        explanation_parts.append("Moderately relevant")
    else:
        explanation_parts.append("Related")
    
    # Content analysis
    section_content = (section_text + " " + section_title).lower()
    
    # Check for common keywords with current context
    persona_keywords = scoring.keyword_set(persona)
    job_keywords = scoring.keyword_set(job)
    section_keywords = scoring.keyword_set(section_content)
    
    common_persona = persona_keywords & section_keywords
    common_job = job_keywords & section_keywords
    
    # Build contextual relevance
    if common_persona and common_job:
        key_terms = list((common_persona | common_job))[:3]
        explanation_parts.append(f"content covering {', '.join(key_terms)}")
    elif common_persona:
        key_terms = list(common_persona)[:2]
        explanation_parts.append(f"information on {', '.join(key_terms)} for {persona.lower()}s")
    elif common_job:
        key_terms = list(common_job)[:2]
        explanation_parts.append(f"insights on {', '.join(key_terms)} for your {job.lower()}")
    
    # Add section characteristics
    if level == 1:
        explanation_parts.append("major section")
    elif word_count > 200:
        explanation_parts.append("comprehensive coverage")
    elif word_count > 100:
        explanation_parts.append("detailed information")
    
    # Add confidence indicator for high-confidence sections
    if confidence >= 0.8:
        explanation_parts.append("high-quality content")
    
    # Construct final explanation
    if len(explanation_parts) >= 2:
        return f"{explanation_parts[0]} {explanation_parts[1]}"
    elif explanation_parts:
        return explanation_parts[0] + " to your current reading context"
    else:
        return "Contains complementary information that may support your understanding"

def generate_relevance_explanation(section: Dict[str, Any], 
                                 current_section: str,
                                 persona: str, 
                                 job: str) -> str:
    """
    Generate a brief explanation of why a section is relevant (legacy function).
    """
    # Delegate to enhanced function with default values
    return generate_enhanced_explanation(section, current_section, persona, job, 0.5, 0.5)