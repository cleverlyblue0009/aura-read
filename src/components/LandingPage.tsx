import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { apiService, DocumentInfo } from '@/lib/api';
import { 
  Upload, 
  Brain, 
  Mic, 
  Eye, 
  Clock, 
  BookOpen,
  Accessibility,
  Palette,
  Volume2,
  Loader2
} from 'lucide-react';

interface LandingPageProps {
  onStart: (documents: DocumentInfo[], persona: string, jobToBeDone: string) => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [persona, setPersona] = useState('');
  const [jobToBeDone, setJobToBeDone] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

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

  const handleStart = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one PDF file to continue.",
        variant: "destructive"
      });
      return;
    }

    if (!persona.trim() || !jobToBeDone.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both your role and what you want to accomplish.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // First check if backend is available
      try {
        await apiService.healthCheck();
      } catch (healthError) {
        toast({
          title: "Backend service unavailable",
          description: "The backend service is not running. Starting in demo mode with sample content.",
          variant: "default"
        });
        
        // Create mock documents for demo mode
        const mockDocuments = selectedFiles.map((file, index) => ({
          id: `demo-${index}`,
          name: file.name,
          title: file.name.replace('.pdf', ''),
          outline: [
            { level: 'H1', text: 'Introduction', page: 1 },
            { level: 'H2', text: 'Overview', page: 2 },
            { level: 'H1', text: 'Main Content', page: 5 },
            { level: 'H2', text: 'Analysis', page: 8 },
            { level: 'H1', text: 'Conclusion', page: 12 }
          ],
          language: 'en',
          upload_timestamp: new Date().toISOString()
        }));
        
        onStart(mockDocuments, persona, jobToBeDone);
        return;
      }

      const uploadedDocuments = await apiService.uploadPDFs(selectedFiles);
      
      toast({
        title: "Upload successful",
        description: `Successfully uploaded ${uploadedDocuments.length} document(s).`
      });
      
      onStart(uploadedDocuments, persona, jobToBeDone);
    } catch (error) {
      console.error('Upload failed:', error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Upload failed",
        description: `Failed to upload and process PDFs: ${errorMessage}. Please check if the backend service is running.`,
        variant: "destructive"
      });
      
             // Offer demo mode as fallback
       setTimeout(() => {
         const createMockDocuments = () => {
           const mockDocuments = selectedFiles.map((file, index) => ({
             id: `demo-${index}`,
             name: file.name,
             title: file.name.replace('.pdf', ''),
             outline: [
               { level: 'H1', text: 'Introduction', page: 1 },
               { level: 'H2', text: 'Overview', page: 2 },
               { level: 'H1', text: 'Main Content', page: 5 },
               { level: 'H2', text: 'Analysis', page: 8 },
               { level: 'H1', text: 'Conclusion', page: 12 }
             ],
             language: 'en',
             upload_timestamp: new Date().toISOString()
           }));
           onStart(mockDocuments, persona, jobToBeDone);
         };

         toast({
           title: "Try demo mode?",
           description: "Continue with sample content while the backend is being set up.",
           variant: "default",
           action: (
             <ToastAction altText="Start Demo" onClick={createMockDocuments}>
               Start Demo
             </ToastAction>
           )
         });
       }, 2000);
    } finally {
      setIsUploading(false);
    }
  };

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
        <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-medium border border-brand-primary/20">
              <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
              AI-Powered Reading Assistant
            </div>
            <h2 className="text-5xl md:text-7xl font-bold text-text-primary leading-[1.05] tracking-tight">
              Transform PDFs into
              <span className="text-transparent bg-gradient-primary bg-clip-text block mt-2">intelligent reading</span>
              experiences
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed font-light">
              Upload your documents and unlock AI-powered insights, personalized highlights, 
              and universal accessibility features designed for every reader.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-text-tertiary">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                Instant Processing
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                Privacy First
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                Fully Accessible
              </div>
            </div>
          </div>

          {/* Upload Zone */}
          <Card className="max-w-4xl mx-auto shadow-xl border-0 bg-surface-elevated/80 backdrop-blur-md">
            <CardHeader className="pb-8 text-center">
              <CardTitle className="text-3xl font-bold">Get Started</CardTitle>
              <CardDescription className="text-lg text-text-secondary">
                Upload your PDFs and personalize your reading experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 relative
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
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="relative z-20 pointer-events-none">
                  <Upload className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-text-primary font-medium">
                      Drop your PDFs here or click to browse
                    </p>
                    <p className="text-sm text-text-secondary">
                      Supports multiple files • Max 10MB per file
                    </p>
                  </div>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2 relative z-20 pointer-events-none">
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
                disabled={selectedFiles.length === 0 || isUploading}
                size="lg"
                className="w-full gap-3 h-16 text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-primary hover:bg-gradient-primary/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin" />
                    Processing PDFs...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-7 w-7" />
                    Start Intelligent Reading
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-text-primary mb-4">Powerful Features</h3>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                Experience the future of document reading with our AI-powered tools
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                {/* Features showcase - informational only */}
                <Card className="group text-center transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-surface-elevated/60 backdrop-blur-md">
                  <CardContent className="p-10 space-y-6">
                    <div className="h-20 w-20 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Brain className="h-10 w-10 text-brand-primary" />
                    </div>
                    <h3 className="font-bold text-xl text-text-primary">AI Insights</h3>
                    <p className="text-text-secondary leading-relaxed">Get key takeaways and contradictions powered by advanced AI</p>
                  </CardContent>
                </Card>

                <Card className="group text-center transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-surface-elevated/60 backdrop-blur-md">
                  <CardContent className="p-10 space-y-6">
                    <div className="h-20 w-20 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Volume2 className="h-10 w-10 text-brand-primary" />
                    </div>
                    <h3 className="font-bold text-xl text-text-primary">Podcast Mode</h3>
                    <p className="text-text-secondary leading-relaxed">Listen to AI-narrated summaries of any section</p>
                  </CardContent>
                </Card>

                <Card className="group text-center transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-surface-elevated/60 backdrop-blur-md">
                  <CardContent className="p-10 space-y-6">
                    <div className="h-20 w-20 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Accessibility className="h-10 w-10 text-brand-primary" />
                    </div>
                    <h3 className="font-bold text-xl text-text-primary">Universal Access</h3>
                    <p className="text-text-secondary leading-relaxed">Dyslexia-friendly fonts, voice reading, and accessibility support</p>
                  </CardContent>
                </Card>

                <Card className="group text-center transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-surface-elevated/60 backdrop-blur-md">
                  <CardContent className="p-10 space-y-6">
                    <div className="h-20 w-20 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Eye className="h-10 w-10 text-brand-primary" />
                    </div>
                    <h3 className="font-bold text-xl text-text-primary">Smart Highlights</h3>
                    <p className="text-text-secondary leading-relaxed">Automatically highlight content relevant to your role</p>
                  </CardContent>
                </Card>

                <Card className="group text-center transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-surface-elevated/60 backdrop-blur-md">
                  <CardContent className="p-10 space-y-6">
                    <div className="h-20 w-20 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Clock className="h-10 w-10 text-brand-primary" />
                    </div>
                    <h3 className="font-bold text-xl text-text-primary">Reading Progress</h3>
                    <p className="text-text-secondary leading-relaxed">Track your progress with intelligent time estimates</p>
                  </CardContent>
                </Card>

                <Card className="group text-center transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-surface-elevated/60 backdrop-blur-md">
                  <CardContent className="p-10 space-y-6">
                    <div className="h-20 w-20 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Palette className="h-10 w-10 text-brand-primary" />
                    </div>
                    <h3 className="font-bold text-xl text-text-primary">Adaptive Themes</h3>
                    <p className="text-text-secondary leading-relaxed">Light, dark, and accessible themes for comfortable reading</p>
                  </CardContent>
                </Card>
              </div>
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