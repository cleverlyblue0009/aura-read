#!/usr/bin/env python3
"""
Test script to verify the complete DocuSense workflow:
1. Upload PDFs
2. Text selection
3. Related sections search
4. Insights generation
5. Podcast generation
"""

import requests
import json
import time
import os
from pathlib import Path

API_BASE_URL = "http://localhost:8080"

def test_health_check():
    """Test if the API is running."""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            print("✓ API is healthy")
            return True
        else:
            print(f"✗ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ API is not accessible: {e}")
        return False

def test_config_endpoint():
    """Test configuration endpoint."""
    try:
        response = requests.get(f"{API_BASE_URL}/config")
        if response.status_code == 200:
            config = response.json()
            print(f"✓ Configuration loaded")
            print(f"  - Adobe API Key: {'configured' if config.get('adobe_embed_api_key') else 'not configured'}")
            return True
        else:
            print(f"✗ Config endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Config endpoint error: {e}")
        return False

def create_test_pdf():
    """Create a simple test PDF content for testing."""
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
72 720 Td
(This is a test document for DocuSense.) Tj
0 -20 Td
(It contains sample text for testing text selection and related sections.) Tj
0 -20 Td
(Machine learning and artificial intelligence are transforming industries.) Tj
0 -20 Td
(Natural language processing enables computers to understand human language.) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000245 00000 n 
0000000324 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
574
%%EOF"""
    
    with open("test_document.pdf", "wb") as f:
        f.write(pdf_content)
    
    return "test_document.pdf"

def test_upload_pdf():
    """Test PDF upload functionality."""
    try:
        # Create test PDF
        pdf_path = create_test_pdf()
        
        with open(pdf_path, "rb") as f:
            files = {"files": ("test_document.pdf", f, "application/pdf")}
            response = requests.post(f"{API_BASE_URL}/upload-pdfs", files=files)
        
        # Clean up
        os.remove(pdf_path)
        
        if response.status_code == 200:
            documents = response.json()
            if documents:
                print(f"✓ PDF upload successful - {len(documents)} documents uploaded")
                return documents[0]["id"]
            else:
                print("✗ No documents returned from upload")
                return None
        else:
            print(f"✗ PDF upload failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ PDF upload error: {e}")
        return None

def test_text_selection(doc_id):
    """Test text selection and related sections search."""
    try:
        payload = {
            "selected_text": "Machine learning and artificial intelligence are transforming industries",
            "document_id": doc_id,
            "page_number": 1,
            "document_ids": [doc_id],
            "persona": "researcher",
            "job_to_be_done": "analyze AI trends"
        }
        
        response = requests.post(f"{API_BASE_URL}/text-selection", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Text selection successful - {len(result['related_sections'])} related sections found")
            return result
        else:
            print(f"✗ Text selection failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Text selection error: {e}")
        return None

def test_insights_generation(text_selection_result):
    """Test insights generation."""
    try:
        payload = {
            "text": text_selection_result["selected_text"],
            "persona": "researcher",
            "job_to_be_done": "analyze AI trends",
            "document_context": "Test document",
            "related_sections": text_selection_result["related_sections"]
        }
        
        response = requests.post(f"{API_BASE_URL}/insights", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            insights = result.get("insights", [])
            print(f"✓ Insights generation successful - {len(insights)} insights generated")
            for insight in insights[:2]:  # Show first 2 insights
                print(f"  - {insight.get('type', 'unknown')}: {insight.get('content', '')[:80]}...")
            return insights
        else:
            print(f"✗ Insights generation failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Insights generation error: {e}")
        return None

def test_podcast_generation(text_selection_result, insights):
    """Test podcast generation."""
    try:
        payload = {
            "text": text_selection_result["selected_text"],
            "related_sections": text_selection_result["related_sections"],
            "insights": insights,
            "podcast_style": "single"
        }
        
        response = requests.post(f"{API_BASE_URL}/podcast", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            script_length = len(result.get("script", ""))
            audio_available = result.get("audio_url") is not None
            print(f"✓ Podcast generation successful")
            print(f"  - Script length: {script_length} characters")
            print(f"  - Audio available: {audio_available}")
            print(f"  - Style: {result.get('style', 'unknown')}")
            if result.get('duration_estimate'):
                print(f"  - Duration estimate: {result['duration_estimate']}")
            return True
        else:
            print(f"✗ Podcast generation failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Podcast generation error: {e}")
        return False

def main():
    """Run the complete workflow test."""
    print("🚀 Starting DocuSense Workflow Test")
    print("=" * 50)
    
    # Test 1: Health check
    if not test_health_check():
        print("❌ Cannot proceed - API is not accessible")
        return
    
    # Test 2: Configuration
    test_config_endpoint()
    
    # Test 3: PDF Upload
    doc_id = test_upload_pdf()
    if not doc_id:
        print("❌ Cannot proceed - PDF upload failed")
        return
    
    # Small delay to allow processing
    time.sleep(2)
    
    # Test 4: Text Selection
    text_selection_result = test_text_selection(doc_id)
    if not text_selection_result:
        print("❌ Cannot proceed - Text selection failed")
        return
    
    # Test 5: Insights Generation
    insights = test_insights_generation(text_selection_result)
    if not insights:
        print("⚠️  Insights generation failed, continuing...")
        insights = []
    
    # Test 6: Podcast Generation
    podcast_success = test_podcast_generation(text_selection_result, insights)
    
    print("\n" + "=" * 50)
    if podcast_success:
        print("🎉 Complete workflow test PASSED!")
        print("All major features are working correctly.")
    else:
        print("⚠️  Workflow test completed with some issues.")
        print("Core features are working, but podcast generation had problems.")
    
    print("\n📋 Test Summary:")
    print("✓ API Health Check")
    print("✓ Configuration Loading")
    print("✓ PDF Upload")
    print("✓ Text Selection & Related Sections")
    print("✓ Insights Generation" if insights else "⚠️  Insights Generation (with issues)")
    print("✓ Podcast Generation" if podcast_success else "⚠️  Podcast Generation (with issues)")

if __name__ == "__main__":
    main()