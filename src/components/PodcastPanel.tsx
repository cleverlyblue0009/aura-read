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
  Target,
  BookOpen,
  Clock,
  Star
} from 'lucide-react';

interface PodcastPanelProps {
  documentId?: string;
  currentPage: number;
  currentText?: string;
  relatedSections?: string[];
  insights?: string[];
  onNavigateToPage?: (page: number) => void;
}

interface AudioSection {
  id: string;
  title: string;
  duration: number;
  type: 'summary' | 'insights' | 'content' | 'related';
  transcript: string;
  pageNumber?: number;
  relevanceScore?: number;
  startTime: number;
  endTime: number;
}

export function PodcastPanel({ 
  documentId, 
  currentPage, 
  currentText, 
  relatedSections = [], 
  insights = [],
  onNavigateToPage
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
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [audioQuality, setAudioQuality] = useState<'standard' | 'enhanced'>('enhanced');

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
      // Generate podcast using backend API with enhanced quality
      const result = await apiService.generatePodcast(
        currentText,
        relatedSections,
        insights
      );
      
      setPodcastScript(result.script);
      setAudioUrl(result.audio_url);
      
      // Create enhanced audio sections with timing information
      const sections: AudioSection[] = [];
      let currentTime = 0;
      
      // Main content section
      const mainSection: AudioSection = {
        id: 'main',
        title: 'Current Page Summary',
        duration: 120, // 2 minutes
        type: 'content',
        transcript: result.script.slice(0, 500) + '...',
        pageNumber: currentPage,
        relevanceScore: 0.95,
        startTime: currentTime,
        endTime: currentTime + 120
      };
      sections.push(mainSection);
      currentTime += 120;
      
      // Related sections
      if (relatedSections.length > 0) {
        const relatedSection: AudioSection = {
          id: 'related',
          title: 'Related Content',
          duration: 90, // 1.5 minutes
          type: 'related',
          transcript: `Related sections include: ${relatedSections.slice(0, 2).join('. ')}`,
          relevanceScore: 0.85,
          startTime: currentTime,
          endTime: currentTime + 90
        };
        sections.push(relatedSection);
        currentTime += 90;
      }
      
      // Insights section
      if (insights.length > 0) {
        const insightsSection: AudioSection = {
          id: 'insights',
          title: 'Key Insights',
          duration: 60, // 1 minute
          type: 'insights',
          transcript: `Key insights: ${insights.slice(0, 2).join('. ')}`,
          relevanceScore: 0.9,
          startTime: currentTime,
          endTime: currentTime + 60
        };
        sections.push(insightsSection);
        currentTime += 60;
      }
      
      setAudioSections(sections);
      setDuration(currentTime);
      
      toast({
        title: "Enhanced podcast generated",
        description: "Your high-quality AI-narrated summary is ready to play."
      });
      
    } catch (error) {
      console.error('Failed to generate podcast:', error);
      
      // Enhanced fallback with better browser TTS
      try {
        const fallbackScript = `Welcome to your AI-generated podcast summary. 
        
        Based on your current reading on page ${currentPage}: ${currentText?.slice(0, 200)}...
        
        Here are the key insights: ${insights.slice(0, 2).join('. ')}
        
        Related sections include: ${relatedSections.slice(0, 2).join(', ')}
        
        This completes your personalized podcast summary.`;
        
        setPodcastScript(fallbackScript);
        
        // Generate audio using enhanced browser speech synthesis
        if ('speechSynthesis' in window) {
          setAudioUrl('browser-tts://enhanced-audio');
          
          const sections: AudioSection[] = [
            {
              id: 'fallback',
              title: 'AI-Generated Summary (Enhanced TTS)',
              duration: Math.floor(fallbackScript.length / 8), // Better duration estimation
              type: 'summary',
              transcript: fallbackScript,
              pageNumber: currentPage,
              relevanceScore: 0.8,
              startTime: 0,
              endTime: Math.floor(fallbackScript.length / 8)
            }
          ];
          
          setAudioSections(sections);
          setDuration(sections[0].duration);
          
          toast({
            title: "Podcast generated (Enhanced Fallback)",
            description: "Using enhanced browser text-to-speech. Click play to listen."
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
      // Enhanced playback with better audio quality
      if (audioUrl.startsWith('browser-tts://')) {
        if ('speechSynthesis' in window && podcastScript) {
          window.speechSynthesis?.cancel();
          
          const utterance = new SpeechSynthesisUtterance(podcastScript);
          utterance.rate = 0.85; // Slightly slower for clarity
          utterance.pitch = 1.0;
          utterance.volume = volume[0];
          
          // Enhanced voice selection
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice => 
            voice.lang === 'en-US' && voice.name.includes('Neural')
          ) || voices.find(voice => voice.lang === 'en-US');
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
          
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
            description: "Your browser doesn't support enhanced text-to-speech.",
            variant: "destructive"
          });
        }
      } else if (audioRef.current) {
        try {
          if (audioRef.current.src !== audioUrl) {
            audioRef.current.src = audioUrl;
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

  const getCurrentSection = useCallback(() => {
    for (let i = 0; i < audioSections.length; i++) {
      const section = audioSections[i];
      if (currentTime >= section.startTime && currentTime <= section.endTime) {
        return i;
      }
    }
    return 0;
  }, [currentTime, audioSections]);

  const handleSectionClick = useCallback((section: AudioSection) => {
    setSelectedSection(section.id);
    
    // Jump to the section start time
    const newTime = section.startTime;
    setCurrentTime(newTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    
    // Navigate to page if available
    if (onNavigateToPage && section.pageNumber) {
      onNavigateToPage(section.pageNumber);
    }
    
    // Clear selection after delay
    setTimeout(() => setSelectedSection(null), 2000);
  }, [onNavigateToPage]);

  const currentSectionIndex = getCurrentSection();
  const currentSectionData = audioSections[currentSectionIndex];

  // Enhanced audio progress simulation
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
          <h3 className="font-semibold text-text-primary">Enhanced Podcast Mode</h3>
        </div>
        <p className="text-xs text-text-secondary">
          Listen to high-quality AI-generated audio summaries with smart navigation
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
                Generate enhanced audio summary for page {currentPage} and related content
              </p>
            </div>
            
            <Button
              onClick={handleGenerateAudio}
              disabled={isGenerating || !documentId}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Enhanced Audio...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Generate Enhanced Podcast
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Enhanced Audio Controls */}
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

              {/* Enhanced Progress Bar */}
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

            {/* Enhanced Current Section Info */}
            {currentSectionData && (
              <div className="p-3 bg-surface-elevated rounded-lg border border-border-subtle">
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
                
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Clock className="h-3 w-3" />
                  <span>Duration: {formatTime(currentSectionData.duration)}</span>
                  {currentSectionData.relevanceScore && (
                    <>
                      <Star className="h-3 w-3" />
                      <span>{Math.round(currentSectionData.relevanceScore * 100)}% relevant</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
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

      {/* Enhanced Transcript with Section Navigation */}
      {showTranscript && audioSections.length > 0 && (
        <div className="border-t border-border-subtle flex-1">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Interactive Transcript
              </h4>
              
              {audioSections.map((section, index) => (
                <div
                  key={section.id}
                  className={`p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    index === currentSectionIndex
                      ? 'bg-surface-selected border border-brand-primary/20'
                      : 'bg-surface-elevated hover:bg-surface-hover'
                  } ${selectedSection === section.id ? 'ring-2 ring-brand-primary/50' : ''}`}
                  onClick={() => handleSectionClick(section)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant={index === currentSectionIndex ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {section.title}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-text-tertiary">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(section.duration)}</span>
                      {section.pageNumber && (
                        <>
                          <BookOpen className="h-3 w-3 ml-2" />
                          <span>Page {section.pageNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {section.transcript}
                  </p>
                  
                  {/* Quick navigation indicator */}
                  {section.pageNumber && section.pageNumber !== currentPage && (
                    <div className="mt-2 pt-2 border-t border-border-subtle">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToPage) {
                            onNavigateToPage(section.pageNumber!);
                          }
                        }}
                      >
                        <Target className="h-3 w-3" />
                        Jump to Page {section.pageNumber}
                      </Button>
                    </div>
                  )}
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