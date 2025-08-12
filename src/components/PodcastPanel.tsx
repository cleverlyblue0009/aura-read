import { useState, useRef, useEffect } from 'react';
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
  Loader2
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

export function PodcastPanel({ 
  documentId, 
  currentPage, 
  currentText, 
  relatedSections = [], 
  insights = [] 
}: PodcastPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // 3 minutes
  const [volume, setVolume] = useState([0.7]);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioSections, setAudioSections] = useState<AudioSection[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [podcastScript, setPodcastScript] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleGenerateAudio = async () => {
    if (!currentText) {
      toast({
        title: "No content available",
        description: "Please navigate to a section with content to generate a podcast.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      // Generate podcast using backend API
      const result = await apiService.generatePodcast(
        currentText,
        relatedSections,
        insights
      );
      
      setPodcastScript(result.script);
      setAudioUrl(result.audio_url);
      
      // Create audio sections from the generated content
      const generatedSection: AudioSection = {
        id: '1',
        title: 'AI-Generated Summary',
        duration: 180, // Estimated duration
        type: 'summary',
        transcript: result.script
      };
      
      setAudioSections([generatedSection]);
      setDuration(180);
      
      toast({
        title: "Podcast generated",
        description: "Your AI-narrated summary is ready to play."
      });
      
    } catch (error) {
      console.error('Failed to generate podcast:', error);
      
      // Fallback: Create a mock podcast with browser text-to-speech
      try {
        const fallbackScript = `Welcome to your AI-generated podcast summary. 
        
        Based on your current reading: ${currentText?.slice(0, 200)}...
        
        Here are the key insights: ${insights.slice(0, 2).join('. ')}
        
        Related sections include: ${relatedSections.slice(0, 2).join(', ')}
        
        This completes your personalized podcast summary.`;
        
        setPodcastScript(fallbackScript);
        
        // Generate audio using browser's speech synthesis
        if ('speechSynthesis' in window) {
          // Create a mock audio URL since we can't generate actual file
          setAudioUrl('browser-tts://mock-audio');
          
          const generatedSection: AudioSection = {
            id: '1',
            title: 'AI-Generated Summary (Browser TTS)',
            duration: Math.floor(fallbackScript.length / 10), // Estimate duration
            type: 'summary',
            transcript: fallbackScript
          };
          
          setAudioSections([generatedSection]);
          setDuration(generatedSection.duration);
          
          toast({
            title: "Podcast generated (Fallback)",
            description: "Using browser text-to-speech. Click play to listen."
          });
        } else {
          throw new Error("Speech synthesis not supported");
        }
        
      } catch (fallbackError) {
        toast({
          title: "Podcast generation failed",
          description: "Unable to generate audio. Please check your connection and try again.",
          variant: "destructive"
        });
        // Don't fallback to mock data - leave sections empty
        setAudioSections([]);
        setPodcastScript('');
        setAudioUrl('');
      }
    } finally {
      setIsGenerating(false);
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
    
    if (isPlaying) {
      // Pause audio or speech synthesis
      if (audioUrl.startsWith('browser-tts://')) {
        window.speechSynthesis?.cancel();
        setIsPlaying(false);
      } else if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Check if this is browser TTS or real audio
      if (audioUrl.startsWith('browser-tts://')) {
        // Use browser speech synthesis
        if ('speechSynthesis' in window && podcastScript) {
          // Cancel any existing speech
          window.speechSynthesis?.cancel();
          
          const utterance = new SpeechSynthesisUtterance(podcastScript);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = volume[0];
          
          utterance.onstart = () => setIsPlaying(true);
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => {
            setIsPlaying(false);
            toast({
              title: "Playback failed",
              description: "Unable to play audio. Please try again.",
              variant: "destructive"
            });
          };
          
          window.speechSynthesis.speak(utterance);
        } else {
          toast({
            title: "Speech synthesis not available",
            description: "Your browser doesn't support text-to-speech.",
            variant: "destructive"
          });
        }
      } else if (audioRef.current) {
        try {
          // Set the audio source if not already set
          if (audioRef.current.src !== audioUrl) {
            audioRef.current.src = audioUrl;
            // Wait for the audio to load
            await new Promise((resolve, reject) => {
              audioRef.current!.onloadeddata = resolve;
              audioRef.current!.onerror = reject;
            });
          }
          
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Error playing audio:', error);
          toast({
            title: "Playback failed",
            description: "Unable to play audio. Please check the audio file.",
            variant: "destructive"
          });
          setIsPlaying(false);
        }
      }
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSection(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (newTime: number[]) => {
    const time = newTime[0];
    setCurrentTime(time);
    
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(newVolume);
    setIsMuted(vol === 0);
    
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
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
      if (currentTime <= timeAccumulator) {
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
    
    if (isPlaying && audioSections.length > 0) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, audioSections.length]);

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
              disabled={isGenerating || !documentId}
              className="w-full gap-2"
            >
              {isGenerating ? (
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
                    const newTime = Math.max(0, currentTime - 15);
                    setCurrentTime(newTime);
                  }}
                  aria-label="Skip back 15 seconds"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  onClick={handlePlayPause}
                  className="h-12 w-12 rounded-full"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newTime = Math.min(duration, currentTime + 15);
                    setCurrentTime(newTime);
                  }}
                  aria-label="Skip forward 15 seconds"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  max={duration}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
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
                  {isMuted || volume[0] === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                
                <Slider
                  value={isMuted ? [0] : volume}
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
            setDuration(audioRef.current.duration);
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
    </div>
  );
}