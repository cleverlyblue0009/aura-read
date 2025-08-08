import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Brain, 
  Mic, 
  Eye, 
  Clock, 
  BookOpen,
  Accessibility,
  Palette,
  Volume2
} from 'lucide-react';

interface LandingPageProps {
  onStart: (files: File[], persona: string, jobToBeDone: string) => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [persona, setPersona] = useState('');
  const [jobToBeDone, setJobToBeDone] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (files: FileList) => {
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    setSelectedFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleStart = () => {
    if (selectedFiles.length > 0) {
      onStart(selectedFiles, persona, jobToBeDone);
    }
  };

  const features = [
    {
      icon: Brain,
      title: "AI Insights",
      description: "Get key takeaways and contradictions powered by Gemini"
    },
    {
      icon: Volume2,
      title: "Podcast Mode",
      description: "Listen to AI-narrated summaries of any section"
    },
    {
      icon: Accessibility,
      title: "Universal Access",
      description: "Dyslexia-friendly fonts, voice reading, and color-blind support"
    },
    {
      icon: Eye,
      title: "Smart Highlights",
      description: "Automatically highlight content relevant to your role"
    },
    {
      icon: Clock,
      title: "Reading Progress",
      description: "Track your progress with time estimates"
    },
    {
      icon: Palette,
      title: "Adaptive Themes",
      description: "Light, dark, and pastel themes for comfortable reading"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border-subtle bg-surface-elevated/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-brand-primary" />
          <h1 className="text-2xl font-bold text-text-primary">DocuSense</h1>
          <span className="text-sm text-text-secondary">Intelligent PDF Reading</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight">
              Turn your PDFs into an
              <span className="text-transparent bg-gradient-primary bg-clip-text"> intelligent</span>,
              <br />
              <span className="text-transparent bg-gradient-primary bg-clip-text">accessible</span> reading experience
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Upload your documents and get AI-powered insights, personalized highlights, 
              and universal accessibility features designed for every reader.
            </p>
          </div>

          {/* Upload Zone */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Get Started</CardTitle>
              <CardDescription>
                Upload your PDFs and tell us about your reading goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
                  ${dragActive 
                    ? 'border-brand-primary bg-surface-hover' 
                    : 'border-border-subtle hover:border-brand-primary/50'
                  }
                `}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-text-primary font-medium">
                    Drop your PDFs here or click to browse
                  </p>
                  <p className="text-sm text-text-secondary">
                    Supports multiple files • Max 10MB per file
                  </p>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-text-primary">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected:
                    </p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="text-sm text-text-secondary bg-surface-elevated rounded px-3 py-1">
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Persona & Job Input */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="persona">Your Role/Persona</Label>
                  <Input
                    id="persona"
                    placeholder="e.g., Researcher, Student, Analyst"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job">Your Goal</Label>
                  <Input
                    id="job"
                    placeholder="e.g., Exam prep, Market research"
                    value={jobToBeDone}
                    onChange={(e) => setJobToBeDone(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={handleStart}
                disabled={selectedFiles.length === 0}
                size="lg"
                className="w-full gap-2"
              >
                <BookOpen className="h-5 w-5" />
                Start Reading Experience
              </Button>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover-scale transition-all duration-300">
                <CardContent className="p-6 space-y-3">
                  <feature.icon className="h-8 w-8 text-brand-primary mx-auto" />
                  <h3 className="font-semibold text-text-primary">{feature.title}</h3>
                  <p className="text-sm text-text-secondary">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-border-subtle bg-surface-elevated/50">
        <div className="max-w-6xl mx-auto text-center text-sm text-text-secondary">
          <p>Built for intelligent reading • Powered by AI • Accessible by design</p>
        </div>
      </footer>
    </div>
  );
}