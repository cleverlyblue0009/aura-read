import os
import asyncio
import uuid
from typing import Optional
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

load_dotenv()

class TTSService:
    def __init__(self):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.speech_region = os.getenv("AZURE_SPEECH_REGION", "eastus")
        self.speech_config = None
        self.fallback_available = True
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Azure Speech service with enhanced error handling."""
        if self.speech_key:
            try:
                self.speech_config = speechsdk.SpeechConfig(
                    subscription=self.speech_key, 
                    region=self.speech_region
                )
                # Use a high-quality, natural-sounding voice
                self.speech_config.speech_synthesis_voice_name = "en-US-AriaNeural"
                # Set output format for better quality
                self.speech_config.set_speech_synthesis_output_format(
                    speechsdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3
                )
                print("Azure TTS service initialized successfully")
            except Exception as e:
                print(f"Failed to initialize Azure TTS: {e}")
                self.speech_config = None
        else:
            print("Warning: AZURE_SPEECH_KEY not found in environment variables")
    
    def is_available(self) -> bool:
        """Check if TTS service is available."""
        return self.speech_config is not None or self.fallback_available
    
    async def generate_audio(self, text: str) -> Optional[str]:
        """Generate audio file from text with enhanced reliability."""
        if not text or not text.strip():
            print("No text provided for TTS generation")
            return None
            
        # Try Azure TTS first
        if self.speech_config:
            try:
                return await self._generate_azure_audio(text)
            except Exception as e:
                print(f"Azure TTS failed: {e}, trying fallback...")
        
        # Fallback to system TTS if available
        if self.fallback_available:
            try:
                return await self._generate_fallback_audio(text)
            except Exception as e:
                print(f"Fallback TTS failed: {e}")
        
        # Create a placeholder audio file when no TTS is available
        return await self._create_placeholder_audio(text)
    
    async def _generate_azure_audio(self, text: str) -> Optional[str]:
        """Generate audio using Azure TTS service."""
        # Generate unique filename
        audio_filename = f"podcast_{uuid.uuid4()}.mp3"
        audio_path = f"audio_cache/{audio_filename}"
        
        # Ensure audio cache directory exists
        os.makedirs("audio_cache", exist_ok=True)
        
        # Configure audio output with better quality settings
        audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_path)
        
        # Create synthesizer
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=self.speech_config,
            audio_config=audio_config
        )
        
        # Process text to add natural pauses and improve speech quality
        processed_text = self._process_text_for_speech(text)
        
        # Generate speech with timeout
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(synthesizer.speak_ssml_async(processed_text).get),
                timeout=60.0  # 60 second timeout
            )
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                # Verify file was created and has content
                if os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
                    print(f"Azure audio generated successfully: {audio_filename}")
                    return audio_filename
                else:
                    print("Azure audio file is empty or missing")
                    return None
            else:
                print(f"Azure speech synthesis failed: {result.reason}")
                if hasattr(result, 'error_details'):
                    print(f"Error details: {result.error_details}")
                return None
                
        except asyncio.TimeoutError:
            print("Azure TTS generation timed out")
            return None
        except Exception as e:
            print(f"Azure TTS error: {e}")
            return None
    
    async def _create_placeholder_audio(self, text: str) -> Optional[str]:
        """Create a placeholder audio file when TTS is not available."""
        try:
            # Generate unique filename
            audio_filename = f"placeholder_{uuid.uuid4()}.txt"
            audio_path = f"audio_cache/{audio_filename}"
            
            # Ensure audio cache directory exists
            os.makedirs("audio_cache", exist_ok=True)
            
            # Save text content as placeholder
            with open(audio_path, 'w') as f:
                f.write(f"Audio placeholder for: {text[:500]}")
            
            print(f"Placeholder audio file created: {audio_filename}")
            return audio_filename
        except Exception as e:
            print(f"Failed to create placeholder audio: {e}")
            return None
    
    async def _generate_fallback_audio(self, text: str) -> Optional[str]:
        """Generate audio using system TTS as fallback."""
        try:
            import pyttsx3
            
            # Generate unique filename
            audio_filename = f"fallback_{uuid.uuid4()}.wav"
            audio_path = f"audio_cache/{audio_filename}"
            
            # Ensure audio cache directory exists
            os.makedirs("audio_cache", exist_ok=True)
            
            # Initialize pyttsx3 engine
            engine = pyttsx3.init()
            
            # Configure voice settings
            voices = engine.getProperty('voices')
            if voices:
                # Try to use a female voice if available
                for voice in voices:
                    if 'female' in voice.name.lower() or 'aria' in voice.name.lower():
                        engine.setProperty('voice', voice.id)
                        break
                else:
                    # Use first available voice
                    engine.setProperty('voice', voices[0].id)
            
            # Set speech rate and volume
            engine.setProperty('rate', 180)  # Slightly slower for better comprehension
            engine.setProperty('volume', 0.9)
            
            # Clean text for better speech
            clean_text = self._clean_text_for_fallback(text)
            
            # Generate audio file
            engine.save_to_file(clean_text, audio_path)
            await asyncio.to_thread(engine.runAndWait)
            
            # Verify file was created
            if os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
                print(f"Fallback audio generated successfully: {audio_filename}")
                return audio_filename
            else:
                print("Fallback audio file is empty or missing")
                return None
                
        except ImportError:
            print("pyttsx3 not available for fallback TTS")
            self.fallback_available = False
            return None
        except Exception as e:
            print(f"Fallback TTS error: {e}")
            return None
    
    def _process_text_for_speech(self, text: str) -> str:
        """Process text to make it more natural for Azure speech synthesis."""
        # Clean up text
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Add pauses for better flow
        text = text.replace('[PAUSE]', '<break time="1s"/>')
        text = text.replace('...', '<break time="0.5s"/>')
        
        # Add natural pauses after sentences
        text = re.sub(r'([.!?])\s+', r'\1 <break time="0.7s"/> ', text)
        
        # Add pauses after commas for better phrasing
        text = re.sub(r'(,)\s+', r'\1 <break time="0.3s"/> ', text)
        
        # Emphasize important phrases
        text = re.sub(r'\b(important|key|crucial|significant)\b', r'<emphasis level="moderate">\1</emphasis>', text, flags=re.IGNORECASE)
        
        # Wrap in SSML with enhanced prosody
        ssml_text = f'''
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="en-US-AriaNeural">
                <prosody rate="0.9" pitch="+2%" volume="85">
                    <emphasis level="reduced">
                        {text}
                    </emphasis>
                </prosody>
            </voice>
        </speak>
        '''
        
        return ssml_text
    
    def _clean_text_for_fallback(self, text: str) -> str:
        """Clean text for fallback TTS systems."""
        import re
        
        # Remove SSML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove special markers
        text = text.replace('[PAUSE]', '... ')
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Limit length for better performance
        if len(text) > 2000:
            # Find a good breaking point near the limit
            sentences = text.split('. ')
            truncated = []
            current_length = 0
            
            for sentence in sentences:
                if current_length + len(sentence) > 1800:
                    break
                truncated.append(sentence)
                current_length += len(sentence) + 2
            
            text = '. '.join(truncated)
            if not text.endswith('.'):
                text += '.'
        
        return text
    
    async def generate_simple_audio(self, text: str) -> Optional[str]:
        """Generate audio without advanced processing for simple text."""
        if not text or not text.strip():
            return None
            
        # Use the main generation method but with simpler processing
        simple_text = text[:1000]  # Limit length
        return await self.generate_audio(simple_text)
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """Clean up old audio files to save disk space."""
        try:
            import time
            audio_dir = "audio_cache"
            if not os.path.exists(audio_dir):
                return
                
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for filename in os.listdir(audio_dir):
                file_path = os.path.join(audio_dir, filename)
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getctime(file_path)
                    if file_age > max_age_seconds:
                        try:
                            os.remove(file_path)
                            print(f"Cleaned up old audio file: {filename}")
                        except Exception as e:
                            print(f"Failed to remove {filename}: {e}")
        except Exception as e:
            print(f"Error during cleanup: {e}")