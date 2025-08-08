import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Settings
} from 'lucide-react';

interface PodcastPanelProps {
  documentId?: string;
  currentPage: number;
}

interface AudioSection {
  id: string;
  title: string;
  duration: number;
  type: 'summary' | 'insights' | 'content';
  transcript: string;
}

export function PodcastPanel({ documentId, currentPage }: PodcastPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // 3 minutes
  const [volume, setVolume] = useState([0.7]);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioSections, setAudioSections] = useState<AudioSection[]>([]);
  const [currentSection, setCurrentSection] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  const mockSections: AudioSection[] = [
    {
      id: '1',
      title: 'Chapter Summary',
      duration: 75,
      type: 'summary',
      transcript: 'In this section, we explore the groundbreaking applications of artificial intelligence in healthcare, focusing on diagnostic imaging and machine learning algorithms that achieve 94% accuracy rates.'
    },
    {
      id: '2',
      title: 'Key Insights',
      duration: 60,
      type: 'insights',
      transcript: 'The most significant finding is the reduction in diagnostic time by 60%, which has profound implications for patient care efficiency and healthcare system optimization.'
    },
    {
      id: '3',
      title: 'Related Content',
      duration: 45,
      type: 'content',
      transcript: 'Cross-referencing with other research papers shows similar trends in AI adoption across medical institutions, with particular success in radiology and pathology departments.'
    }
  ];

  const handleGenerateAudio = async () => {
    if (!documentId) return;
    
    setIsGenerating(true);
    
    // Simulate audio generation delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setAudioSections(mockSections);
    setDuration(mockSections.reduce((acc, section) => acc + section.duration, 0));
    setIsGenerating(false);
  };

  const handlePlayPause = () => {
    if (audioSections.length === 0) {
      handleGenerateAudio();
      return;
    }
    
    setIsPlaying(!isPlaying);
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
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