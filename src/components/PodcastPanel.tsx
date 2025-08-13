import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  FileText,
  Mic,
  Download,
  Settings,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PodcastPanelProps {
  documentId?: string;
  currentPage: number;
  currentText?: string;
  relatedSections?: string[];
  insights?: string[];
}

interface AudioSection {
  id: string;
  title: string;
  duration: number;
  type: 'summary' | 'insights' | 'content';
  transcript: string;
}

interface AudioState {
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  hasError: boolean;
  errorMessage: string;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export function PodcastPanel({ 
  documentId, 
  currentPage, 
  currentText, 
  relatedSections = [], 
  insights = [] 
}: PodcastPanelProps) {
  const [audioState, setAudioState] = useState<AudioState>({
    isLoading: false,
    isPlaying: false,
    isPaused: false,
    hasError: false,
    errorMessage: '',
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false
  });

  const [showTranscript, setShowTranscript] = useState(false);
  const [audioSections, setAudioSections] = useState<AudioSection[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [podcastScript, setPodcastScript] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const ttsProgressRef = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  // Enhanced audio state management
  const updateAudioState = useCallback((updates: Partial<AudioState>) => {
    setAudioState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleGenerateAudio = async () => {
    if (!currentText || currentText.trim().length < 10) {
      toast({
        title: "Insufficient content",
        description: "Please navigate to a section with more content to generate a meaningful podcast.",
        variant: "destructive"
      });
      return;
    }
    
    updateAudioState({ 
      isLoading: true, 
      hasError: false, 
      errorMessage: '' 
    });
    
    setGenerationProgress('Analyzing content...');
    
    try {
      // Enhanced content preparation
      const contentForPodcast = prepareContentForPodcast(currentText, relatedSections, insights);
      
      setGenerationProgress('Generating podcast script...');
      
      // Generate podcast using backend API with retry logic
      let result;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          result = await apiService.generatePodcast(
            contentForPodcast.text,
            contentForPodcast.sections,
            contentForPodcast.insights
          );
          break; // Success, exit retry loop
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          
          setGenerationProgress(`Retrying... (${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
        }
      }
      
      if (!result) {
        throw new Error('Failed to generate podcast after multiple attempts');
      }
      
      setPodcastScript(result.script);
      setGenerationProgress('Generating audio...');
      
      // Handle audio URL - could be from backend or browser TTS
      if (result.audio_url && !result.audio_url.startsWith('browser-tts://')) {
        // Real audio file from backend
        const fullAudioUrl = result.audio_url.startsWith('http') 
          ? result.audio_url 
          : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${result.audio_url}`;
        
        setAudioUrl(fullAudioUrl);
        
        // Verify audio file is accessible
        try {
          const response = await fetch(fullAudioUrl, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error('Audio file not accessible');
          }
        } catch (error) {
          console.warn('Audio file verification failed, using browser TTS fallback');
          setAudioUrl('browser-tts://fallback');
        }
      } else {
        // Use browser TTS fallback
        setAudioUrl('browser-tts://fallback');
      }
      
      // Create audio sections from the generated content
      const generatedSection: AudioSection = {
        id: '1',
        title: 'AI-Generated Podcast Summary',
        duration: estimateAudioDuration(result.script),
        type: 'summary',
        transcript: result.script
      };
      
      setAudioSections([generatedSection]);
      updateAudioState({ 
        duration: generatedSection.duration,
        isLoading: false 
      });
      setGenerationProgress('');
      
      toast({
        title: "Podcast generated successfully",
        description: "Your AI-narrated summary is ready to play.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to generate podcast:', error);
      
      // Enhanced fallback with better error handling
      try {
        const fallbackScript = createFallbackScript(currentText, insights, relatedSections);
        
        if (!fallbackScript || fallbackScript.length < 50) {
          throw new Error('Unable to create meaningful content');
        }
        
        setPodcastScript(fallbackScript);
        setAudioUrl('browser-tts://fallback');
        
        const fallbackSection: AudioSection = {
          id: '1',
          title: 'Generated Summary (Browser TTS)',
          duration: estimateAudioDuration(fallbackScript),
          type: 'summary',
          transcript: fallbackScript
        };
        
        setAudioSections([fallbackSection]);
        updateAudioState({ 
          duration: fallbackSection.duration,
          isLoading: false 
        });
        
        toast({
          title: "Podcast generated with fallback",
          description: "Using browser text-to-speech. Audio quality may be limited.",
          variant: "default"
        });
        
      } catch (fallbackError) {
        console.error('Fallback generation failed:', fallbackError);
        updateAudioState({ 
          isLoading: false,
          hasError: true,
          errorMessage: 'Failed to generate podcast. Please try again with different content.'
        });
        
        toast({
          title: "Podcast generation failed",
          description: "Unable to generate audio. Please check your content and try again.",
          variant: "destructive"
        });
        
        setAudioSections([]);
        setPodcastScript('');
        setAudioUrl('');
      }
    } finally {
      setGenerationProgress('');
      updateAudioState({ isLoading: false });
    }
  };

  const handlePlayPause = async () => {
    if (audioSections.length === 0) {
      await handleGenerateAudio();
      return;
    }
    
    if (!audioUrl) {
      toast({
        title: "No audio available",
        description: "Please generate the podcast first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (audioState.isPlaying) {
        // Pause current playback
        if (audioUrl.startsWith('browser-tts://')) {
          window.speechSynthesis?.pause();
          updateAudioState({ isPlaying: false, isPaused: true });
        } else if (audioRef.current) {
          audioRef.current.pause();
          updateAudioState({ isPlaying: false, isPaused: true });
        }
      } else {
        // Start or resume playback
        if (audioUrl.startsWith('browser-tts://')) {
          await handleBrowserTTSPlayback();
        } else {
          await handleAudioFilePlayback();
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      updateAudioState({ 
        hasError: true, 
        errorMessage: 'Playback failed. Please try regenerating the audio.' 
      });
      
      toast({
        title: "Playback failed",
        description: "Unable to play audio. Please try regenerating.",
        variant: "destructive"
      });
    }
  };

  const handleBrowserTTSPlayback = async () => {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel();
    
    if (audioState.isPaused && speechUtteranceRef.current) {
      // Resume paused speech
      window.speechSynthesis.resume();
      updateAudioState({ isPlaying: true, isPaused: false });
      return;
    }
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(podcastScript);
    
    // Enhanced voice configuration
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Try to find a good quality voice
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.name.includes('Natural') ||
        voice.localService === false
      ) || voices[0];
      
      utterance.voice = preferredVoice;
    }
    
    // Optimize speech settings
    utterance.rate = 0.85; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = audioState.volume;
    
    // Set up event handlers
    utterance.onstart = () => updateAudioState({ isPlaying: true, isPaused: false, hasError: false });
    utterance.onend = () => updateAudioState({ isPlaying: false, isPaused: false, currentTime: 0 });
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      updateAudioState({ 
        isPlaying: false, 
        hasError: true, 
        errorMessage: 'Speech synthesis failed' 
      });
    };
    
    // Progress tracking for browser TTS (approximate)
    let progressInterval: NodeJS.Timeout;
    utterance.onstart = () => {
      ttsProgressRef.current = 0;
      updateAudioState({ isPlaying: true, isPaused: false });

      progressInterval = setInterval(() => {
        ttsProgressRef.current += 1;
        updateAudioState(prev => ({
          ...prev,
          currentTime: Math.min(ttsProgressRef.current, prev.duration)
        }));
      }, 1000);
    };

    utterance.onend = () => {
      clearInterval(progressInterval);
      updateAudioState({ isPlaying: false, isPaused: false, currentTime: 0 });
    };
    
    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleAudioFilePlayback = async () => {
    if (!audioRef.current) return;
    
    try {
      // Set audio source if not already set
      if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
        
        // Wait for audio to load with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 10000);
          
          audioRef.current!.onloadeddata = () => {
            clearTimeout(timeout);
            resolve(true);
          };
          audioRef.current!.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Audio load failed'));
          };
        });
      }
      
      await audioRef.current.play();
      updateAudioState({ isPlaying: true, isPaused: false, hasError: false });
      
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  };

  // Helper functions
  const prepareContentForPodcast = (text: string, sections: string[], insights: string[]) => {
    return {
      text: text.slice(0, 1500), // Limit for better processing
      sections: sections.slice(0, 3), // Top 3 related sections
      insights: insights.slice(0, 3) // Top 3 insights
    };
  };

  const estimateAudioDuration = (text: string): number => {
    // Estimate ~150 words per minute for TTS
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / 150) * 60);
  };

  const createFallbackScript = (text: string, insights: string[], sections: string[]): string => {
    const intro = "Welcome to your AI-generated podcast summary.";
    
    const content = text.slice(0, 300);
    const contentSection = content ? `Here's a summary of the current section: ${content}` : '';
    
    const insightsSection = insights.length > 0 
      ? `Key insights include: ${insights.slice(0, 2).join('. ')}`
      : '';
    
    const relatedSection = sections.length > 0 
      ? `Related sections to explore: ${sections.slice(0, 2).join(', ')}`
      : '';
    
    const outro = "This completes your personalized podcast summary.";
    
    return [intro, contentSection, insightsSection, relatedSection, outro]
      .filter(Boolean)
      .join('. ');
  };

  const handleStop = () => {
    updateAudioState({ isPlaying: false, isPaused: false, currentTime: 0 });
    setCurrentSection(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Cancel any speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleSeek = (newTime: number[]) => {
    const time = newTime[0];
    updateAudioState({ currentTime: time });
    
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    updateAudioState({ volume: vol });
    updateAudioState({ isMuted: vol === 0 });
    
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    updateAudioState({ isMuted: !audioState.isMuted });
    if (audioRef.current) {
      audioRef.current.muted = !audioState.isMuted;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSection = () => {
    let timeAccumulator = 0;
    for (let i = 0; i < audioSections.length; i++) {
      timeAccumulator += audioSections[i].duration;
      if (audioState.currentTime <= timeAccumulator) {
        return i;
      }
    }
    return audioSections.length - 1;
  };

  const currentSectionIndex = getCurrentSection();
  const currentSectionData = audioSections[currentSectionIndex];

  // Simulate audio progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (audioState.isPlaying && audioSections.length > 0) {
      interval = setInterval(() => {
        updateAudioState(prev => {
          const newTime = prev.currentTime + 1;
          if (newTime >= audioState.duration) {
            updateAudioState({ isPlaying: false, currentTime: audioState.duration });
            return { ...prev, currentTime: audioState.duration };
          }
          return { ...prev, currentTime: newTime };
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [audioState.isPlaying, audioState.duration, audioSections.length]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <Mic className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-text-primary">Podcast Mode</h3>
        </div>
        <p className="text-xs text-text-secondary">
          Listen to AI-generated audio summaries and insights
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Generate/Play Controls */}
        {audioSections.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Mic className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <h4 className="text-sm font-medium text-text-primary mb-2">
                No Audio Generated
              </h4>
              <p className="text-xs text-text-secondary mb-4">
                Generate audio summary for page {currentPage} and related content
              </p>
            </div>
            
            <Button
              onClick={handleGenerateAudio}
              disabled={audioState.isLoading || !documentId}
              className="w-full gap-2"
            >
              {audioState.isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating Audio...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Generate Podcast
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Audio Controls */}
            <div className="space-y-4">
              {/* Main Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newTime = Math.max(0, audioState.currentTime - 15);
                    updateAudioState({ currentTime: newTime });
                  }}
                  aria-label="Skip back 15 seconds"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  onClick={handlePlayPause}
                  className="h-12 w-12 rounded-full"
                  aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                >
                  {audioState.isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newTime = Math.min(audioState.duration, audioState.currentTime + 15);
                    updateAudioState({ currentTime: newTime });
                  }}
                  aria-label="Skip forward 15 seconds"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Slider
                  value={[audioState.currentTime]}
                  onValueChange={handleSeek}
                  max={audioState.duration}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span>{formatTime(audioState.currentTime)}</span>
                  <span>{formatTime(audioState.duration)}</span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="p-1"
                >
                  {audioState.isMuted || audioState.volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                
                <Slider
                  value={audioState.isMuted ? [0] : [audioState.volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.1}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Current Section Info */}
            {currentSectionData && (
              <div className="p-3 bg-surface-elevated rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {currentSectionData.type}
                  </Badge>
                  <span className="text-xs text-text-tertiary">
                    Section {currentSectionIndex + 1} of {audioSections.length}
                  </span>
                </div>
                
                <h4 className="text-sm font-medium text-text-primary mb-1">
                  {currentSectionData.title}
                </h4>
                
                <p className="text-xs text-text-secondary">
                  Duration: {formatTime(currentSectionData.duration)}
                </p>
              </div>
            )}

            {/* Transcript Toggle */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex-1 gap-2"
              >
                <FileText className="h-4 w-4" />
                {showTranscript ? 'Hide' : 'Show'} Transcript
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log('Download audio')}
                aria-label="Download audio"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log('Audio settings')}
                aria-label="Audio settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Transcript */}
      {showTranscript && audioSections.length > 0 && (
        <div className="border-t border-border-subtle flex-1">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Transcript
              </h4>
              
              {audioSections.map((section, index) => (
                <div
                  key={section.id}
                  className={`p-3 rounded-lg transition-colors ${
                    index === currentSectionIndex
                      ? 'bg-surface-selected border border-brand-primary/20'
                      : 'bg-surface-elevated'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant={index === currentSectionIndex ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {section.title}
                    </Badge>
                    <span className="text-xs text-text-tertiary">
                      {formatTime(section.duration)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {section.transcript}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            updateAudioState({ duration: audioRef.current.duration });
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            updateAudioState({ currentTime: audioRef.current.currentTime });
          }
        }}
        onEnded={() => {
          updateAudioState({ isPlaying: false, currentTime: 0 });
        }}
      />
    </div>
  );
}