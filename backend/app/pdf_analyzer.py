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
    """Detect headings in the PDF text blocks with improved logic."""
    if not text_blocks:
        return []
    
    # Skip form detection for now - it's too restrictive
    outline = []
    size_to_level_map = get_heading_hierarchy(text_blocks)
    seen_headings_on_page = defaultdict(set) 
    font_size_counts = defaultdict(int)
    
    for block in text_blocks:
        font_size_counts[round(block["font_size"], 2)] += 1
    
    # Get the most common font size (likely body text)
    body_text_size = sorted(font_size_counts, key=font_size_counts.get, reverse=True)[0]
    
    # Get average font size for better comparison
    total_chars = sum(len(block["text"]) * font_size_counts[round(block["font_size"], 2)] for block in text_blocks)
    total_font_weight = sum(round(block["font_size"], 2) * len(block["text"]) for block in text_blocks)
    avg_font_size = total_font_weight / total_chars if total_chars > 0 else body_text_size
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
        word_count = len(text.split())
        
        # Improved heading detection logic
        
        # 1. Numbered headings (most reliable)
        if re.match(r'^\d+\.\d+\.\d+\.\d+\s', text): 
            level = "H4"
        elif re.match(r'^\d+\.\d+\.\d+\s', text): 
            level = "H3"
        elif re.match(r'^\d+\.\d+\s', text): 
            level = "H2"
        elif re.match(r'^\d+\.\s', text) and word_count > 1:
            level = "H1"
        
        # 2. Roman numerals
        elif re.match(r'^[IVX]+\.\s', text) and word_count > 1:
            level = "H1"
        
        # 3. Letter headings (A., B., etc.)
        elif re.match(r'^[A-Z]\.\s', text) and word_count > 1 and word_count <= 8:
            level = "H2"
        
        # Skip lines that are likely not headings
        if ':' in text and len(text.split(':')[-1].strip().split()) > 4:
            continue
        
        # 4. Font-size based detection (improved)
        if level is None:
            font_size_threshold = max(body_text_size * 1.1, avg_font_size * 1.05)
            
            # Very large fonts are likely main headings
            if font_size >= body_text_size * 1.5:
                if 1 <= word_count <= 10 and len(text) <= 100:
                    level = "H1"
            # Moderately larger fonts
            elif font_size >= font_size_threshold:
                if 1 <= word_count <= 15 and len(text) <= 120:
                    # Check if it's all caps (common for headings)
                    if text.isupper() and word_count <= 8:
                        level = "H1"
                    # Check if it starts with capital and has title-like structure
                    elif text[0].isupper() and not text.endswith('.') and word_count <= 12:
                        level = "H2"
        
        # 5. Font size mapping from hierarchy
        if level is None and font_size in size_to_level_map:
            if len(text) < 100 and text.count('.') < 2 and word_count <= 15:
                level = size_to_level_map[font_size]
        
        # 6. Position-based detection (headings often start lines)
        if level is None and font_size > body_text_size:
            bbox = block.get("bbox", [0, 0, 0, 0])
            x_position = bbox[0] if bbox else 0
            
            # Left-aligned text with larger font might be heading
            if x_position < 100 and word_count <= 10 and len(text) <= 80:
                if not text.endswith('.') and not text.islower():
                    level = "H2"
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
        return {
            "title": title,
            "outline": outline,
            "language": doc_language,
            "text_blocks": text_blocks
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

def extract_page_content(pdf_path: str, page_num: int) -> str:
    """Extract text content from a specific page."""
    try:
        document = fitz.open(pdf_path)
        if page_num < 0 or page_num >= document.page_count:
            document.close()
            return ""
        
        page = document.load_page(page_num)
        text = page.get_text()
        document.close()
        return text.strip()
    except Exception as e:
        print(f"Error extracting page {page_num} from {pdf_path}: {e}")
        return ""

def extract_section_content(pdf_path: str, start_page: int, end_page: int = None) -> str:
    """Extract text content from a range of pages."""
    try:
        document = fitz.open(pdf_path)
        if end_page is None:
            end_page = start_page
        
        content = ""
        for page_num in range(start_page, min(end_page + 1, document.page_count)):
            if page_num >= 0:
                page = document.load_page(page_num)
                content += page.get_text() + "\n"
        
        document.close()
        return content.strip()
    except Exception as e:
        print(f"Error extracting section from {pdf_path}: {e}")
        return ""

def get_pdf_metadata(pdf_path: str) -> dict:
    """Extract PDF metadata including page count and basic info."""
    try:
        document = fitz.open(pdf_path)
        metadata = {
            "page_count": document.page_count,
            "title": document.metadata.get("title", ""),
            "author": document.metadata.get("author", ""),
            "subject": document.metadata.get("subject", ""),
            "creator": document.metadata.get("creator", ""),
        }
        document.close()
        return metadata
    except Exception as e:
        print(f"Error extracting metadata from {pdf_path}: {e}")
        return {"page_count": 0}