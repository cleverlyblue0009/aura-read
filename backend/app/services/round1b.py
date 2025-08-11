import os
from typing import List, Dict, Any

from .util_paths import TMP_DIR

# import local modules copied from user Round 1B
from .r1b_outline_core import extract_outline_blocks, LineBlock
from . import r1b_scoring as scoring  # type: ignore

import re

SNIP_SPLIT_RE = re.compile(r"(?<=[\.!?])\s+|[\r\n]+|•")


def _build_sections_from_blocks(blocks: List[LineBlock], doc_name: str) -> List[Dict[str, Any]]:
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
        else:
            if current_heading is not None:
                current_text.append(b.text)
                current_pages.add(b.page)
    flush()

    if not sections:
        text_all = " ".join([b.text for b in blocks if b.tag != "TITLE"]).strip()
        sections.append({
            "doc": doc_name,
            "heading": doc_name,
            "page": 1,
            "text": text_all
        })
    return sections


def _extract_subsections(section: Dict[str, Any], persona: str, job: str, max_snips: int = 3):
    text = section["text"]
    if not text:
        return []
    parts = []
    for seg in SNIP_SPLIT_RE.split(text):
        seg = seg.strip()
        if not seg:
            continue
        seg = re.sub(r"^[•\-\*\u2022●◦]\s*", "", seg)
        parts.append(seg)
    if not parts:
        return []
    query = scoring.build_query(persona, job)
    scores = scoring.tfidf_scores(query, parts)
    order = scores.argsort()[::-1]
    out = []
    base_page = section["page"]
    for idx in order[:max_snips]:
        out.append({
            "document": section["doc"],
            "refined_text": parts[idx],
            "page_number": base_page
        })
    return out


def recommend_sections(pdf_paths: List[str], persona: str, job: str, topk_sections: int = 20, max_snips_per_section: int = 3):
    all_sections: List[Dict[str, Any]] = []
    for pdf_path in pdf_paths:
        doc_name = os.path.basename(pdf_path)
        title, blocks = extract_outline_blocks(pdf_path)
        secs = _build_sections_from_blocks(blocks, doc_name)
        all_sections.extend(secs)

    query = scoring.build_query(persona, job)
    kw = scoring.build_keywords(persona, job)
    headings = [s["heading"] for s in all_sections]
    texts = [s["text"] for s in all_sections]
    scores = scoring.combined_scores(query, headings, texts, kw)
    for s, sc in zip(all_sections, scores):
        s["score"] = float(sc)
    all_sections.sort(key=lambda x: x["score"], reverse=True)

    top_sections = all_sections[: min(len(all_sections), topk_sections)]

    all_sub = []
    for sec in top_sections:
        all_sub.extend(_extract_subsections(sec, persona, job, max_snips=max_snips_per_section))

    return {
        "extracted_sections": [
            {
                "document": s["doc"],
                "section_title": s["heading"],
                "importance_rank": i + 1,
                "page_number": s["page"],
                "score": s["score"],
            }
            for i, s in enumerate(top_sections)
        ],
        "subsection_analysis": all_sub,
    }