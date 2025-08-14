import json
import os
import re
import fitz  # PyMuPDF
from collections import defaultdict
from langdetect import detect
from typing import List, Dict, Any, Optional

def extract_text_with_metadata(pdf_path: str):
    """Extract text blocks with metadata from PDF using PyMuPDF."""
    document = fitz.open(pdf_path)
    text_blocks = []
    for page_num in range(document.page_count):
        page = document.load_page(page_num)
        blocks = page.get_text("dict")["blocks"]
        for b in blocks:
            if b["type"] == 0:
                for line in b["lines"]:
                    full_line_text = " ".join([span["text"] for span in line["spans"]]).strip()
                    if not full_line_text:
                        continue
                    first_span = line["spans"][0]
                    text_blocks.append({
                        "text": full_line_text,
                        "page": page_num,
                        "font_size": first_span["size"],
                        "bbox": line["bbox"]
                    })
    document.close()
    return text_blocks

def get_heading_hierarchy(text_blocks):
    """Determine heading hierarchy based on font sizes."""
    font_size_counts = defaultdict(int)
    for block in text_blocks:
        font_size_counts[round(block["font_size"], 2)] += 1
    unique_sizes = sorted(font_size_counts.keys(), reverse=True)
    if not unique_sizes:
        return {}
    body_text_size = sorted(font_size_counts.items(), key=lambda item: item[1], reverse=True)[0][0]
    heading_candidates = [
        size for size in unique_sizes 
        if size > body_text_size * 1.1 and font_size_counts[size] < len(text_blocks) * 0.10
    ]
    size_to_level_map = {}
    levels = ["H1", "H2", "H3", "H4"] 
    for i, size in enumerate(heading_candidates[:len(levels)]):
        size_to_level_map[size] = levels[i]
    return size_to_level_map

def get_pdf_title(text_blocks):
    """Extract the title from PDF text blocks."""
    if not text_blocks:
        return ""
    first_page_blocks = [b for b in text_blocks if b["page"] == 0]
    if not first_page_blocks:
        return ""
    first_page_blocks.sort(key=lambda x: (x["font_size"], x["bbox"][1]), reverse=True)
    max_font_size = first_page_blocks[0]["font_size"]
    potential_title_lines = [
        b for b in first_page_blocks 
        if b["font_size"] >= max_font_size * 0.9 and b["bbox"][1] < 400 
    ]
    potential_title_lines.sort(key=lambda x: x["bbox"][1])
    combined_title = ""
    last_y = -1
    last_x = -1
    line_count = 0
    title_lines = []
    for block in potential_title_lines:
        text = block["text"].strip()
        if len(text) < 10 or text.lower() == text:
            continue
        if not title_lines:
            title_lines.append(text)
        elif abs(block["bbox"][1] - last_y) < 25:
            title_lines.append(text)
        else:
            break
        last_y = block["bbox"][3]
    combined_title = " ".join(title_lines)
    return combined_title.strip()

def is_form_pdf(text_blocks):
    """Detect if PDF is a form-based document."""
    if len(text_blocks) > 300:
        return False
    if len(text_blocks) < 20:
        return False
    short_lines = sum(1 for b in text_blocks if len(b['text'].split()) <= 5)
    return short_lines / len(text_blocks) > 0.5

def detect_headings(text_blocks, title):
    """Detect headings in the PDF text blocks."""
    if not text_blocks:
        return []
    if is_form_pdf(text_blocks):
        large_blocks = [b for b in text_blocks if b['font_size'] > 15 and len(b['text'].split()) > 2]
        if not large_blocks:
            return []
    outline = []
    size_to_level_map = get_heading_hierarchy(text_blocks)
    seen_headings_on_page = defaultdict(set) 
    font_size_counts = defaultdict(int)
    for block in text_blocks:
        font_size_counts[round(block["font_size"], 2)] += 1
    body_text_size = sorted(font_size_counts, key=font_size_counts.get, reverse=True)[0]
    for block in text_blocks:
        text = block["text"].strip()
        page = block["page"]
        font_size = round(block["font_size"], 2)
        if text == title or text in title:
            continue
        if re.match(r'^\s*Page\s+\d+\s*$', text, re.IGNORECASE):
            continue
        if text.endswith(":") or text.endswith(";"):
            continue
        if len(text) > 120 and font_size < max(size_to_level_map.keys()) if size_to_level_map else False:
            continue

        level = None
        if re.match(r'^\d+\.\d+\.\d+\.\d+\s', text): 
            level = "H4"
        elif re.match(r'^\d+\.\d+\.\d+\s', text): 
            level = "H3"
        elif re.match(r'^\d+\.\d+\s', text): 
            level = "H2"
        elif re.match(r'^\d+\.\s', text) and len(text.split()) > 1:
            level = "H1"
        if ':' in text and len(text.split(':')[-1].strip().split()) > 4:
            continue
        if level is None and font_size > body_text_size and text.isupper():
            word_count = len(text.split())
            if 1 <= word_count <= 4:
                level = "H1"
        if level is None and font_size in size_to_level_map:
            if len(text) < 80 and text.count('.') < 2 and text.count(' ') < 15:
                level = size_to_level_map[font_size]
        if level is None and font_size > body_text_size * 1.1 and text.isupper():
            word_count = len(text.split())
            if 1 <= word_count <= 6 and 10 <= len(text) <= 60:
                level = "H1"
        if level is None and font_size > body_text_size * 1.05 and len(text.split()) <= 4 and text.isupper():
            level = "H1"
        if level is None and font_size > body_text_size * 1.1 and len(text.split()) >= 4:
            level = "H1"
        if len(text.strip()) < 8 and text.lower() == text:
            continue
        if level:
            item_key = (text, page)
            if item_key not in seen_headings_on_page[page]:
                cleaned_text = text.rstrip(" .")
                outline.append({
                    "level": level,
                    "text": cleaned_text,
                    "page": page 
                })
                seen_headings_on_page[page].add(item_key)
    return outline

def extract_sections_from_outline(text_blocks: List[Dict], outline: List[Dict]) -> List[Dict]:
    """Extract sections with their content based on outline headings."""
    sections = []
    
    if not outline or not text_blocks:
        return sections
    
    # Sort outline by page number
    sorted_outline = sorted(outline, key=lambda x: x['page'])
    
    for i, heading in enumerate(sorted_outline):
        # Find the start and end of this section
        start_page = heading['page']
        end_page = sorted_outline[i + 1]['page'] if i + 1 < len(sorted_outline) else max(b['page'] for b in text_blocks)
        
        # Extract text blocks for this section
        section_blocks = [
            b for b in text_blocks 
            if start_page <= b['page'] <= end_page
        ]
        
        # Combine text from blocks
        section_text = ' '.join([b['text'] for b in section_blocks])
        
        # Clean up the text
        section_text = ' '.join(section_text.split())  # Remove extra whitespace
        
        sections.append({
            'heading': heading['text'],
            'level': heading['level'],
            'page': heading['page'],
            'text': section_text[:2000],  # Limit text length for performance
            'word_count': len(section_text.split())
        })
    
    return sections

def analyze_pdf(pdf_path: str):
    """Analyze PDF and extract title and outline structure."""
    try:
        text_blocks = extract_text_with_metadata(pdf_path)
        sample_text = " ".join([b['text'] for b in text_blocks[:30]])
        try:
            doc_language = detect(sample_text)
        except:
            doc_language = "unknown"
        print(f"Detected language: {doc_language}")

        title = get_pdf_title(text_blocks)
        outline = detect_headings(text_blocks, title)

        if not outline and text_blocks:
            first_page_blocks = [b for b in text_blocks if b["page"] == 0]
            if first_page_blocks:
                largest = max(first_page_blocks, key=lambda b: b["font_size"])
                if largest["text"].strip() and largest["text"].strip() != title:
                    outline = [{
                        "level": "H1",
                        "text": largest["text"].strip(),
                        "page": 0
                    }]
        # Extract sections based on outline
        sections = extract_sections_from_outline(text_blocks, outline)
        
        return {
            "title": title,
            "outline": outline,
            "language": doc_language,
            "text_blocks": text_blocks,
            "sections": sections
        }
    except Exception as e:
        print(f"Error processing {pdf_path}: {e}")
        return {"title": "", "outline": [], "language": "unknown", "text_blocks": []}

def extract_full_text(pdf_path: str) -> str:
    """Extract full text content from PDF for search and analysis."""
    try:
        document = fitz.open(pdf_path)
        full_text = ""
        for page_num in range(document.page_count):
            page = document.load_page(page_num)
            full_text += page.get_text() + "\n"
        document.close()
        return full_text
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return ""