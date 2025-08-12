import os
import re
import time
from datetime import datetime
from typing import Any, Dict, List
from .outline_core import extract_outline_blocks, LineBlock
from . import scoring

# --------------------------------------------------------------------------------------
# Enhanced section extraction with improved accuracy
# --------------------------------------------------------------------------------------
def build_sections_from_blocks(title_block, blocks: List[LineBlock], doc_name: str) -> List[Dict[str, Any]]:
    """
    Converts LineBlocks into logical sections with enhanced accuracy.
    Each section includes:
      doc, heading, page, text, heading_level, context_score
    """
    sections = []
    current_heading = None
    current_text: List[str] = []
    current_pages = set()
    heading_hierarchy = []

    def flush():
        nonlocal current_heading, current_text, current_pages
        if current_heading:
            # Calculate context score based on heading level and content length
            heading_level = get_heading_level(current_heading.text)
            context_score = calculate_context_score(current_heading.text, current_text, heading_level)
            
            sections.append({
                "doc": doc_name,
                "heading": current_heading.text,
                "page": min(current_pages) if current_pages else current_heading.page,
                "text": " ".join(current_text).strip(),
                "heading_level": heading_level,
                "context_score": context_score,
                "word_count": len(" ".join(current_text).split()),
                "has_key_content": has_key_content(" ".join(current_text))
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
            "text": text_all,
            "heading_level": 1,
            "context_score": 0.5,
            "word_count": len(text_all.split()),
            "has_key_content": has_key_content(text_all)
        })

    return sections

def get_heading_level(heading_text: str) -> int:
    """Determine heading level based on text characteristics."""
    # Remove common heading prefixes
    clean_text = re.sub(r'^[0-9\.\s]+', '', heading_text.strip())
    
    # Check for common heading patterns
    if re.match(r'^[A-Z][A-Z\s]+$', clean_text):  # ALL CAPS
        return 1
    elif re.match(r'^[A-Z][a-z\s]+$', clean_text) and len(clean_text) < 50:  # Title case, short
        return 2
    elif re.match(r'^[0-9]+\.', heading_text):  # Numbered
        return 2
    elif re.match(r'^[a-z]\.', heading_text):  # Lettered
        return 3
    else:
        return 2  # Default

def calculate_context_score(heading: str, text_parts: List[str], heading_level: int) -> float:
    """Calculate context relevance score for a section."""
    full_text = " ".join(text_parts)
    
    # Base score from heading level (higher levels = more important)
    level_score = max(0.1, 1.0 - (heading_level - 1) * 0.2)
    
    # Content length score (moderate length is ideal)
    word_count = len(full_text.split())
    length_score = min(1.0, word_count / 200) if word_count > 50 else word_count / 100
    
    # Keyword density score
    keyword_score = calculate_keyword_density(heading, full_text)
    
    # Structure score (presence of lists, definitions, etc.)
    structure_score = calculate_structure_score(full_text)
    
    # Combine scores with weights
    final_score = (
        level_score * 0.3 +
        length_score * 0.2 +
        keyword_score * 0.3 +
        structure_score * 0.2
    )
    
    return min(1.0, final_score)

def calculate_keyword_density(heading: str, text: str) -> float:
    """Calculate keyword density and relevance."""
    # Extract meaningful words from heading
    heading_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', heading.lower()))
    
    # Count occurrences in text
    text_lower = text.lower()
    total_matches = sum(text_lower.count(word) for word in heading_words)
    
    # Normalize by text length
    text_words = len(text.split())
    if text_words == 0:
        return 0.0
    
    density = total_matches / text_words
    return min(1.0, density * 10)  # Scale appropriately

def calculate_structure_score(text: str) -> float:
    """Calculate score based on text structure indicators."""
    score = 0.0
    
    # Lists and bullet points
    if re.search(r'[•\-\*\u2022●◦]\s', text):
        score += 0.3
    
    # Definitions and key terms
    if re.search(r'\b(is|are|refers to|defined as|means)\b', text, re.IGNORECASE):
        score += 0.2
    
    # Examples and case studies
    if re.search(r'\b(example|case|instance|such as|for instance)\b', text, re.IGNORECASE):
        score += 0.2
    
    # Conclusions and summaries
    if re.search(r'\b(conclusion|summary|therefore|thus|in conclusion)\b', text, re.IGNORECASE):
        score += 0.3
    
    # Numbers and statistics
    if re.search(r'\d+%|\d+\.\d+|\d+ out of \d+', text):
        score += 0.2
    
    return min(1.0, score)

def has_key_content(text: str) -> bool:
    """Check if text contains key content indicators."""
    key_indicators = [
        r'\b(important|key|critical|essential|significant)\b',
        r'\b(conclusion|summary|recommendation)\b',
        r'\b(example|case study|instance)\b',
        r'\b(definition|concept|principle)\b',
        r'\d+%|\d+\.\d+',  # Statistics
        r'[•\-\*\u2022●◦]\s'  # Lists
    ]
    
    text_lower = text.lower()
    return any(re.search(pattern, text_lower, re.IGNORECASE) for pattern in key_indicators)

# --------------------------------------------------------------------------------------
# Enhanced ranking with semantic similarity and context awareness
# --------------------------------------------------------------------------------------
def rank_sections(persona: str, job: str, sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enhanced section ranking with improved accuracy."""
    query = scoring.build_query(persona, job)
    kw = scoring.build_keywords(persona, job)
    headings = [s["heading"] for s in sections]
    texts = [s["text"] for s in sections]
    
    # Get base scores
    base_scores = scoring.combined_scores(query, headings, texts, kw)
    
    # Apply context-aware scoring
    for i, section in enumerate(sections):
        base_score = float(base_scores[i])
        
        # Context score adjustment
        context_multiplier = section.get("context_score", 0.5)
        
        # Content quality adjustment
        content_quality = calculate_content_quality(section)
        
        # Semantic relevance adjustment
        semantic_score = calculate_semantic_relevance(section, persona, job)
        
        # Final weighted score
        final_score = (
            base_score * 0.4 +
            context_multiplier * 0.2 +
            content_quality * 0.2 +
            semantic_score * 0.2
        )
        
        section["score"] = final_score
        section["base_score"] = base_score
        section["content_quality"] = content_quality
        section["semantic_relevance"] = semantic_score
    
    # Sort by final score
    sections.sort(key=lambda x: x["score"], reverse=True)
    
    # Add importance rank
    for i, s in enumerate(sections, start=1):
        s["importance_rank"] = i
    
    return sections

def calculate_content_quality(section: Dict[str, Any]) -> float:
    """Calculate content quality score."""
    text = section.get("text", "")
    word_count = section.get("word_count", 0)
    has_key = section.get("has_key_content", False)
    
    # Length quality (optimal range)
    if 100 <= word_count <= 500:
        length_score = 1.0
    elif 50 <= word_count < 100 or 500 < word_count <= 1000:
        length_score = 0.8
    else:
        length_score = 0.5
    
    # Key content bonus
    key_content_bonus = 0.2 if has_key else 0.0
    
    # Readability score
    readability_score = calculate_readability(text)
    
    return min(1.0, length_score + key_content_bonus + readability_score * 0.3)

def calculate_readability(text: str) -> float:
    """Calculate text readability score."""
    if not text:
        return 0.0
    
    sentences = re.split(r'[.!?]+', text)
    words = text.split()
    
    if not sentences or not words:
        return 0.0
    
    avg_sentence_length = len(words) / len(sentences)
    avg_word_length = sum(len(word) for word in words) / len(words)
    
    # Optimal ranges
    if 10 <= avg_sentence_length <= 20 and 4 <= avg_word_length <= 6:
        return 1.0
    elif 8 <= avg_sentence_length <= 25 and 3 <= avg_word_length <= 7:
        return 0.8
    else:
        return 0.5

def calculate_semantic_relevance(section: Dict[str, Any], persona: str, job: str) -> float:
    """Calculate semantic relevance using keyword matching and context."""
    text = section.get("text", "").lower()
    heading = section.get("heading", "").lower()
    
    # Persona keywords
    persona_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', persona.lower()))
    
    # Job keywords
    job_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', job.lower()))
    
    # Combined text for analysis
    combined_text = f"{heading} {text}"
    
    # Calculate matches
    persona_matches = sum(combined_text.count(word) for word in persona_words)
    job_matches = sum(combined_text.count(word) for word in job_words)
    
    # Normalize by text length
    text_length = len(combined_text.split())
    if text_length == 0:
        return 0.0
    
    persona_score = min(1.0, persona_matches / text_length * 20)
    job_score = min(1.0, job_matches / text_length * 20)
    
    # Weighted combination
    return (persona_score * 0.4 + job_score * 0.6)

# --------------------------------------------------------------------------------------
# Enhanced subsection extraction with improved accuracy
# --------------------------------------------------------------------------------------
SNIP_SPLIT_RE = re.compile(r"(?<=[\.!?])\s+|[\r\n]+|•")

def extract_subsections(section: Dict[str, Any],
                        persona: str,
                        job: str,
                        max_snips: int = 3) -> List[Dict[str, Any]]:
    """
    Enhanced subsection extraction with improved accuracy.
    """
    text = section["text"]
    if not text:
        return []

    # Improved candidate splits
    parts = []
    for seg in SNIP_SPLIT_RE.split(text):
        seg = seg.strip()
        if not seg or len(seg) < 20:  # Minimum length threshold
            continue
        # Clean up the segment
        seg = re.sub(r"^[•\-\*\u2022●◦]\s*", "", seg)
        seg = re.sub(r"\s+", " ", seg)  # Normalize whitespace
        parts.append(seg)

    if not parts:
        return []

    # Enhanced scoring
    query = scoring.build_query(persona, job)
    base_scores = scoring.tfidf_scores(query, parts)
    
    # Apply additional scoring factors
    enhanced_scores = []
    for i, part in enumerate(parts):
        base_score = base_scores[i]
        
        # Content quality score
        quality_score = calculate_snippet_quality(part)
        
        # Semantic relevance
        semantic_score = calculate_semantic_relevance({"text": part}, persona, job)
        
        # Final weighted score
        final_score = base_score * 0.5 + quality_score * 0.3 + semantic_score * 0.2
        enhanced_scores.append(final_score)
    
    # Sort by enhanced scores
    order = sorted(range(len(enhanced_scores)), key=lambda i: enhanced_scores[i], reverse=True)

    out = []
    base_page = section["page"]
    for idx in order[:max_snips]:
        out.append({
            "document": section["doc"],
            "refined_text": parts[idx],
            "page_number": base_page,
            "relevance_score": float(enhanced_scores[idx]),
            "quality_score": calculate_snippet_quality(parts[idx])
        })
    return out

def calculate_snippet_quality(snippet: str) -> float:
    """Calculate quality score for a text snippet."""
    if not snippet:
        return 0.0
    
    score = 0.0
    
    # Length score (optimal range)
    word_count = len(snippet.split())
    if 15 <= word_count <= 50:
        score += 0.4
    elif 10 <= word_count <= 80:
        score += 0.3
    else:
        score += 0.1
    
    # Completeness score (complete sentences)
    sentences = re.split(r'[.!?]+', snippet)
    complete_sentences = sum(1 for s in sentences if len(s.strip()) > 10)
    if complete_sentences > 0:
        score += 0.3
    
    # Information density
    if re.search(r'\b(important|key|critical|essential)\b', snippet, re.IGNORECASE):
        score += 0.2
    
    # Examples and specific information
    if re.search(r'\b(example|instance|such as|specifically)\b', snippet, re.IGNORECASE):
        score += 0.1
    
    return min(1.0, score)

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