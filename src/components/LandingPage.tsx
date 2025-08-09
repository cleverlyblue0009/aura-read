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
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-bold text-text-primary leading-[1.1] tracking-tight">
              Transform PDFs into
              <span className="text-transparent bg-gradient-primary bg-clip-text block">intelligent reading</span>
              experiences
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Upload your documents and unlock AI-powered insights, personalized highlights, 
              and universal accessibility features designed for every reader.
            </p>
          </div>

          {/* Upload Zone */}
          <Card className="max-w-3xl mx-auto shadow-lg border-0 bg-surface-elevated/60 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-semibold">Get Started</CardTitle>
              <CardDescription className="text-base">
                Upload your PDFs and personalize your reading experience
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
                className="w-full gap-3 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <BookOpen className="h-6 w-6" />
                Start Intelligent Reading
              </Button>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover-scale transition-all duration-300 border-0 shadow-md hover:shadow-lg bg-surface-elevated/40 backdrop-blur-sm">
                <CardContent className="p-8 space-y-4">
                  <div className="h-16 w-16 bg-brand-primary/10 rounded-xl flex items-center justify-center mx-auto">
                    <feature.icon className="h-8 w-8 text-brand-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-text-primary">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{feature.description}</p>
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