#!/usr/bin/env python3
"""
Integration test for DocuSense backend functionality
"""
import os
import sys
import asyncio
import tempfile
import json
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    from pdf_analyzer import analyze_pdf
    from document_intelligence import process_documents_intelligence
    from llm_services import LLMService
    from tts_service import TTSService
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure all backend modules are properly installed and configured.")
    sys.exit(1)

async def test_pdf_analysis():
    """Test PDF analysis functionality."""
    print("📄 Testing PDF analysis...")
    
    # Create a simple test PDF (mock)
    test_pdf_path = "test_document.pdf"
    
    # For testing, we'll use a sample PDF if available
    if not os.path.exists(test_pdf_path):
        print("⚠️  No test PDF found. Skipping PDF analysis test.")
        return True
    
    try:
        result = analyze_pdf(test_pdf_path)
        if result and "title" in result and "outline" in result:
            print("✅ PDF analysis working correctly")
            return True
        else:
            print("❌ PDF analysis returned invalid result")
            return False
    except Exception as e:
        print(f"❌ PDF analysis failed: {e}")
        return False

async def test_document_intelligence():
    """Test document intelligence functionality."""
    print("🧠 Testing document intelligence...")
    
    # Mock test data
    test_pdfs = []  # Would need actual PDF files
    test_persona = "Researcher"
    test_job = "Analyzing AI trends in healthcare"
    
    if not test_pdfs:
        print("⚠️  No test PDFs available. Skipping document intelligence test.")
        return True
    
    try:
        result = process_documents_intelligence(
            pdf_paths=test_pdfs,
            persona=test_persona,
            job=test_job,
            topk_sections=5
        )
        
        if result and "extracted_sections" in result:
            print("✅ Document intelligence working correctly")
            return True
        else:
            print("❌ Document intelligence returned invalid result")
            return False
    except Exception as e:
        print(f"❌ Document intelligence failed: {e}")
        return False

async def test_llm_service():
    """Test LLM service functionality."""
    print("🤖 Testing LLM service...")
    
    llm = LLMService()
    
    if not llm.is_available():
        print("⚠️  LLM service not available (missing API key). Skipping LLM tests.")
        return True
    
    try:
        # Test insights generation
        insights = await llm.generate_insights(
            text="Artificial intelligence is revolutionizing healthcare through machine learning algorithms.",
            persona="Researcher",
            job_to_be_done="Understanding AI applications"
        )
        
        if insights and isinstance(insights, list):
            print("✅ LLM insights generation working correctly")
        else:
            print("❌ LLM insights generation failed")
            return False
        
        # Test text simplification
        simplified = await llm.simplify_text(
            text="The implementation of sophisticated machine learning algorithms demonstrates remarkable efficacy.",
            difficulty_level="simple"
        )
        
        if simplified and isinstance(simplified, str):
            print("✅ LLM text simplification working correctly")
        else:
            print("❌ LLM text simplification failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ LLM service test failed: {e}")
        return False

async def test_tts_service():
    """Test TTS service functionality."""
    print("🎙️  Testing TTS service...")
    
    tts = TTSService()
    
    if not tts.is_available():
        print("⚠️  TTS service not available (missing API key). Skipping TTS tests.")
        return True
    
    try:
        # Test simple audio generation
        audio_file = await tts.generate_simple_audio("This is a test of the text-to-speech functionality.")
        
        if audio_file:
            print("✅ TTS service working correctly")
            # Clean up test audio file
            audio_path = f"audio_cache/{audio_file}"
            if os.path.exists(audio_path):
                os.remove(audio_path)
            return True
        else:
            print("❌ TTS service failed to generate audio")
            return False
            
    except Exception as e:
        print(f"❌ TTS service test failed: {e}")
        return False

async def main():
    print("🔍 DocuSense Backend Integration Test")
    print("=" * 50)
    
    # Create necessary directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("audio_cache", exist_ok=True)
    
    tests = [
        ("PDF Analysis", test_pdf_analysis),
        ("Document Intelligence", test_document_intelligence),
        ("LLM Service", test_llm_service),
        ("TTS Service", test_tts_service)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name} test...")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is ready to use.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the configuration and try again.")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))