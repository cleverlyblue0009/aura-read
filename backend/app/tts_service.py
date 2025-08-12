import os
import asyncio
import uuid
from typing import Optional, Dict, Any
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

load_dotenv()

class TTSService:
    def __init__(self):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.speech_region = os.getenv("AZURE_SPEECH_REGION", "eastus")
        self.speech_config = None
        self.available_voices = [
            "en-US-AriaNeural",      # Professional, clear
            "en-US-JennyNeural",     # Friendly, engaging
            "en-US-GuyNeural",       # Authoritative, male
            "en-US-DavisNeural",     # Warm, conversational
            "en-US-SaraNeural"       # Clear, educational
        ]
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Azure Speech service with enhanced configuration."""
        if self.speech_key:
            try:
                self.speech_config = speechsdk.SpeechConfig(
                    subscription=self.speech_key, 
                    region=self.speech_region
                )
                
                # Enhanced audio configuration
                self.speech_config.speech_synthesis_voice_name = "en-US-AriaNeural"
                self.speech_config.speech_synthesis_speaking_rate = 0.9  # Slightly slower for clarity
                self.speech_config.speech_synthesis_pitch = 0  # Natural pitch
                
                # Audio output settings for better quality
                self.speech_config.set_speech_synthesis_output_format(
                    speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
                )
                
                print("Azure TTS service initialized successfully with enhanced configuration")
            except Exception as e:
                print(f"Failed to initialize Azure TTS: {e}")
                self.speech_config = None
        else:
            print("Warning: AZURE_SPEECH_KEY not found in environment variables")
    
    def is_available(self) -> bool:
        """Check if TTS service is available."""
        return self.speech_config is not None
    
    async def generate_audio(self, text: str, voice_preference: str = "professional") -> Optional[str]:
        """Generate high-quality audio file from text and return filename."""
        if not self.is_available():
            print("TTS service not available")
            return None
        
        try:
            # Generate unique filename
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = f"audio_cache/{audio_filename}"
            
            # Ensure audio cache directory exists
            os.makedirs("audio_cache", exist_ok=True)
            
            # Configure audio output with high quality
            audio_config = speechsdk.audio.AudioOutputConfig(
                filename=audio_path,
                audio_format=speechsdk.AudioFormat.MP3,
                sample_rate=16000,
                bits_per_sample=16,
                channels=1
            )
            
            # Select voice based on preference
            voice_name = self._select_voice(voice_preference)
            self.speech_config.speech_synthesis_voice_name = voice_name
            
            # Create synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config,
                audio_config=audio_config
            )
            
            # Process text for better speech synthesis
            processed_text = self._process_text_for_speech(text)
            
            # Generate speech with enhanced SSML
            ssml_text = self._create_enhanced_ssml(processed_text, voice_name)
            
            # Generate speech
            result = await asyncio.to_thread(
                synthesizer.speak_ssml_async(ssml_text).get
            )
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                print(f"High-quality audio generated successfully: {audio_filename}")
                return audio_filename
            else:
                print(f"Speech synthesis failed: {result.reason}")
                return None
                
        except Exception as e:
            print(f"Error generating audio: {e}")
            return None
    
    def _select_voice(self, preference: str) -> str:
        """Select appropriate voice based on preference."""
        voice_mapping = {
            "professional": "en-US-AriaNeural",
            "friendly": "en-US-JennyNeural",
            "authoritative": "en-US-GuyNeural",
            "conversational": "en-US-DavisNeural",
            "educational": "en-US-SaraNeural"
        }
        return voice_mapping.get(preference, "en-US-AriaNeural")
    
    def _process_text_for_speech(self, text: str) -> str:
        """Enhanced text processing for natural speech synthesis."""
        # Clean up text
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        text = text.strip()
        
        # Add natural pauses
        text = re.sub(r'([.!?])\s+', r'\1 <break time="0.5s"/> ', text)
        text = re.sub(r'([,;:])\s+', r'\1 <break time="0.2s"/> ', text)
        
        # Handle special characters and formatting
        text = text.replace('&', ' and ')
        text = text.replace('%', ' percent ')
        text = text.replace('$', ' dollars ')
        
        # Add emphasis to important words
        text = self._add_emphasis(text)
        
        return text
    
    def _add_emphasis(self, text: str) -> str:
        """Add emphasis to important words and phrases."""
        # Emphasis patterns
        emphasis_patterns = [
            (r'\b(important|key|critical|essential|significant)\b', 'emphasis'),
            (r'\b(conclusion|summary|recommendation)\b', 'emphasis'),
            (r'\b(example|case study|instance)\b', 'emphasis'),
            (r'\b(definition|concept|principle)\b', 'emphasis'),
            (r'\d+%', 'emphasis'),  # Percentages
            (r'\b(high|low|increased|decreased)\b', 'emphasis')
        ]
        
        for pattern, emphasis_type in emphasis_patterns:
            text = re.sub(pattern, f'<emphasis level="{emphasis_type}">\\1</emphasis>', text, flags=re.IGNORECASE)
        
        return text
    
    def _create_enhanced_ssml(self, text: str, voice_name: str) -> str:
        """Create enhanced SSML for better speech synthesis."""
        ssml_text = f'''
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="{voice_name}">
                <prosody rate="0.9" pitch="+0%" volume="+0%">
                    <break time="0.3s"/>
                    {text}
                    <break time="0.5s"/>
                </prosody>
            </voice>
        </speak>
        '''
        
        return ssml_text
    
    async def generate_podcast_audio(self, script: str, sections: list = None) -> Optional[str]:
        """Generate podcast-style audio with multiple sections and transitions."""
        if not self.is_available():
            return None
        
        try:
            audio_filename = f"podcast_{uuid.uuid4()}.mp3"
            audio_path = f"audio_cache/{audio_filename}"
            
            os.makedirs("audio_cache", exist_ok=True)
            
            # Configure audio output
            audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_path)
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config,
                audio_config=audio_config
            )
            
            # Create podcast-style SSML
            podcast_ssml = self._create_podcast_ssml(script, sections)
            
            result = await asyncio.to_thread(
                synthesizer.speak_ssml_async(podcast_ssml).get
            )
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                print(f"Podcast audio generated: {audio_filename}")
                return audio_filename
            else:
                return None
                
        except Exception as e:
            print(f"Error generating podcast audio: {e}")
            return None
    
    def _create_podcast_ssml(self, script: str, sections: list = None) -> str:
        """Create podcast-style SSML with intros, transitions, and outros."""
        # Podcast intro
        intro = '''
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="en-US-AriaNeural">
                <prosody rate="0.85" pitch="+0%" volume="+0%">
                    <break time="0.5s"/>
                    <emphasis level="strong">Welcome to your AI-generated podcast summary.</emphasis>
                    <break time="0.3s"/>
        '''
        
        # Main content
        main_content = self._process_text_for_speech(script)
        
        # Podcast outro
        outro = '''
                    <break time="0.5s"/>
                    <emphasis level="moderate">Thank you for listening to your personalized summary.</emphasis>
                    <break time="0.3s"/>
                </prosody>
            </voice>
        </speak>
        '''
        
        return intro + main_content + outro
    
    async def generate_simple_audio(self, text: str) -> Optional[str]:
        """Generate simple audio without complex processing."""
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
            
            # Limit text length for simple generation
            limited_text = text[:2000] if len(text) > 2000 else text
            
            result = await asyncio.to_thread(
                synthesizer.speak_text_async(limited_text).get
            )
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                return audio_filename
            else:
                return None
                
        except Exception as e:
            print(f"Error generating simple audio: {e}")
            return None
    
    async def generate_audio_with_metadata(self, text: str, metadata: Dict[str, Any]) -> Optional[str]:
        """Generate audio with additional metadata for better organization."""
        if not self.is_available():
            return None
        
        try:
            # Include metadata in filename for better organization
            doc_id = metadata.get('document_id', 'unknown')
            page_num = metadata.get('page_number', 0)
            section_type = metadata.get('section_type', 'content')
            
            audio_filename = f"{doc_id}_p{page_num}_{section_type}_{uuid.uuid4()}.mp3"
            audio_path = f"audio_cache/{audio_filename}"
            
            os.makedirs("audio_cache", exist_ok=True)
            
            # Generate audio
            result = await self.generate_audio(text)
            if result:
                # Rename to include metadata
                old_path = f"audio_cache/{result}"
                if os.path.exists(old_path):
                    os.rename(old_path, audio_path)
                    return audio_filename
            
            return None
            
        except Exception as e:
            print(f"Error generating audio with metadata: {e}")
            return None

# Import regex at the top level
import re