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
        self.mock_mode = os.getenv("ENABLE_MOCK_MODE", "false").lower() == "true"
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Azure Speech service."""
        if self.speech_key:
            try:
                self.speech_config = speechsdk.SpeechConfig(
                    subscription=self.speech_key, 
                    region=self.speech_region
                )
                # Use a natural-sounding voice
                self.speech_config.speech_synthesis_voice_name = "en-US-AriaNeural"
                print("Azure TTS service initialized successfully")
            except Exception as e:
                print(f"Failed to initialize Azure TTS: {e}")
                self.speech_config = None
        else:
            print("Warning: AZURE_SPEECH_KEY not found in environment variables")
    
    def is_available(self) -> bool:
        """Check if TTS service is available."""
        return self.speech_config is not None or self.mock_mode
    
    async def generate_audio(self, text: str) -> Optional[str]:
        """Generate audio file from text and return filename."""
        if not self.is_available():
            if self.mock_mode:
                # Return a mock audio filename for demonstration
                return "mock_audio_demo.mp3"
            print("TTS service not available")
            return None
        
        try:
            # Generate unique filename
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = f"audio_cache/{audio_filename}"
            
            # Ensure audio cache directory exists
            os.makedirs("audio_cache", exist_ok=True)
            
            # Configure audio output
            audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_path)
            
            # Create synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config,
                audio_config=audio_config
            )
            
            # Process text to add natural pauses
            processed_text = self._process_text_for_speech(text)
            
            # Generate speech
            result = await asyncio.to_thread(
                synthesizer.speak_text_async(processed_text).get
            )
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                print(f"Audio generated successfully: {audio_filename}")
                return audio_filename
            else:
                print(f"Speech synthesis failed: {result.reason}")
                return None
                
        except Exception as e:
            print(f"Error generating audio: {e}")
            return None
    
    def _process_text_for_speech(self, text: str) -> str:
        """Process text to make it more natural for speech synthesis."""
        # Replace [PAUSE] markers with SSML pauses
        text = text.replace("[PAUSE]", '<break time="1s"/>')
        
        # Add pauses after sentences
        import re
        text = re.sub(r'([.!?])\s+', r'\1 <break time="0.5s"/> ', text)
        
        # Wrap in SSML
        ssml_text = f'''
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="en-US-AriaNeural">
                <prosody rate="0.9" pitch="+0%">
                    {text}
                </prosody>
            </voice>
        </speak>
        '''
        
        return ssml_text
    
    async def generate_simple_audio(self, text: str) -> Optional[str]:
        """Generate audio without SSML processing for simple text."""
        if not self.is_available():
            return None
        
        try:
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = f"audio_cache/{audio_filename}"
            
            os.makedirs("audio_cache", exist_ok=True)
            
            audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_path)
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config,
                audio_config=audio_config
            )
            
            result = await asyncio.to_thread(
                synthesizer.speak_text_async(text[:1000]).get  # Limit length
            )
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                return audio_filename
            else:
                return None
                
        except Exception as e:
            print(f"Error generating simple audio: {e}")
            return None