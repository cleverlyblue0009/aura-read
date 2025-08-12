#!/usr/bin/env python3
"""
Test script to validate the improved PDF processing functionality.
Run this script to test the backend improvements.
"""

import sys
import os
sys.path.append('backend')

from backend.app.pdf_analyzer import analyze_pdf, extract_page_content, get_pdf_metadata
from backend.app.llm_services import LLMService
from backend.app.tts_service import TTSService

def test_pdf_analysis():
    """Test PDF analysis with improved heading detection."""
    print("=== Testing PDF Analysis ===")
    
    # You can test with any PDF file
    test_pdf = "test_document.pdf"  # Replace with actual PDF path
    
    if not os.path.exists(test_pdf):
        print(f"⚠️  Test PDF not found at {test_pdf}")
        print("   Please place a test PDF file to validate the improvements")
        return
    
    try:
        # Test basic analysis
        analysis = analyze_pdf(test_pdf)
        print(f"✅ PDF Analysis completed")
        print(f"   Title: {analysis['title']}")
        print(f"   Language: {analysis['language']}")
        print(f"   Headings found: {len(analysis['outline'])}")
        
        for i, heading in enumerate(analysis['outline'][:5]):  # Show first 5 headings
            print(f"   {i+1}. {heading['text']} (Page {heading['page']+1}, Level {heading['level']})")
        
        # Test metadata extraction
        metadata = get_pdf_metadata(test_pdf)
        print(f"✅ Metadata extracted")
        print(f"   Pages: {metadata['page_count']}")
        
        # Test page content extraction
        if metadata['page_count'] > 0:
            content = extract_page_content(test_pdf, 0)  # First page
            print(f"✅ Page content extracted")
            print(f"   First page content length: {len(content)} characters")
            if content:
                print(f"   Preview: {content[:100]}...")
        
    except Exception as e:
        print(f"❌ PDF Analysis failed: {e}")

def test_llm_service():
    """Test LLM service with fallback functionality."""
    print("\n=== Testing LLM Service ===")
    
    llm = LLMService()
    print(f"LLM Available: {llm.is_available()}")
    
    # Test insights generation (should work even without API key via fallback)
    test_text = """
    Artificial intelligence has shown remarkable progress in healthcare applications. 
    Machine learning algorithms achieve 94% accuracy in diagnostic imaging, 
    significantly improving patient outcomes. However, data privacy concerns and 
    regulatory compliance requirements present challenges for widespread adoption.
    """
    
    try:
        import asyncio
        insights = asyncio.run(llm.generate_insights(
            text=test_text,
            persona="Healthcare Administrator", 
            job_to_be_done="Evaluate AI implementation feasibility"
        ))
        
        print(f"✅ Insights generated: {len(insights)} insights")
        for i, insight in enumerate(insights):
            print(f"   {i+1}. [{insight['type']}] {insight['content'][:100]}...")
            
    except Exception as e:
        print(f"❌ LLM Service failed: {e}")

def test_tts_service():
    """Test TTS service functionality."""
    print("\n=== Testing TTS Service ===")
    
    tts = TTSService()
    print(f"TTS Available: {tts.is_available()}")
    
    # Test audio generation (should return fallback identifier if Azure not configured)
    try:
        import asyncio
        audio_file = asyncio.run(tts.generate_audio("This is a test of the text-to-speech service."))
        
        if audio_file:
            print(f"✅ Audio generation completed: {audio_file}")
            if audio_file == "browser-tts-fallback":
                print("   Using browser TTS fallback (Azure TTS not configured)")
            else:
                print(f"   Audio file generated: {audio_file}")
        else:
            print("❌ Audio generation returned None")
            
    except Exception as e:
        print(f"❌ TTS Service failed: {e}")

def main():
    """Run all tests."""
    print("🔍 Testing PDF Reader Backend Improvements")
    print("=" * 50)
    
    test_pdf_analysis()
    test_llm_service() 
    test_tts_service()
    
    print("\n" + "=" * 50)
    print("✨ Testing completed!")
    print("\nTo fully test the improvements:")
    print("1. Start the backend: cd backend && python start.py")
    print("2. Start the frontend: npm run dev")
    print("3. Upload a PDF and test the features")

if __name__ == "__main__":
    main()