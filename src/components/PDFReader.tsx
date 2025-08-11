import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentOutline } from './DocumentOutline';
import { FloatingTools } from './FloatingTools';
import { AdobePDFViewer, FallbackPDFViewer } from './AdobePDFViewer';
import { ThemeToggle } from './ThemeToggle';
import { AccessibilityPanel } from './AccessibilityPanel';
import { InsightsPanel } from './InsightsPanel';
import { PodcastPanel } from './PodcastPanel';
import { HighlightPanel } from './HighlightPanel';
import { TextSimplifier } from './TextSimplifier';
import { ReadingProgressBar } from './ReadingProgressBar';
import { CopyDownloadPanel } from './CopyDownloadPanel';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { apiService, RelatedSection } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { 
  Menu, 
  Upload, 
  BookOpen, 
  Settings,
  Palette
} from 'lucide-react';

export interface PDFDocument {
  id: string;
  name: string;
  url: string;
  outline: OutlineItem[];
}

export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  page: number;
  children?: OutlineItem[];
}

export interface Highlight {
  id: string;
  text: string;
  page: number;
  color: 'primary' | 'secondary' | 'tertiary';
  relevanceScore: number;
  explanation: string;
}

interface PDFReaderProps {
  documents?: PDFDocument[];
  persona?: string;
  jobToBeDone?: string;
  onBack?: () => void;
}

export function PDFReader({ documents, persona, jobToBeDone, onBack }: PDFReaderProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [currentDocument, setCurrentDocument] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeRightPanel, setActiveRightPanel] = useState<'insights' | 'podcast' | 'accessibility' | 'simplifier' | 'export' | null>('insights');
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentInsights, setCurrentInsights] = useState<Array<{ type: string; content: string }>>([]);
  const [relatedSections, setRelatedSections] = useState<RelatedSection[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState<number>(Date.now());
  const [isActivelyReading, setIsActivelyReading] = useState(true);
  const [totalPages, setTotalPages] = useState(30); // Will be updated from PDF
  const { toast } = useToast();

  // Reading progress tracking
  const { getReadingStats, formatTime } = useReadingProgress({
    documentId: currentDocument?.id,
    currentPage,
    totalPages,
    isReading: isActivelyReading
  });

  // Mock document for demo
  const mockDocument: PDFDocument = {
    id: 'demo-doc',
    name: 'Artificial Intelligence in Healthcare - Research Paper.pdf',
    url: '/demo-document.pdf',
    outline: [
      { id: '1', title: 'Abstract', level: 1, page: 1 },
      { id: '2', title: 'Introduction', level: 1, page: 2 },
      { id: '3', title: 'Background and Related Work', level: 1, page: 4 },
      { id: '4', title: 'Machine Learning Applications', level: 2, page: 5 },
      { id: '5', title: 'Deep Learning in Medical Imaging', level: 2, page: 7 },
      { id: '6', title: 'Methodology', level: 1, page: 10 },
      { id: '7', title: 'Data Collection and Preprocessing', level: 2, page: 11 },
      { id: '8', title: 'Model Architecture', level: 2, page: 13 },
      { id: '9', title: 'Results and Analysis', level: 1, page: 16 },
      { id: '10', title: 'Clinical Trial Results', level: 2, page: 17 },
      { id: '11', title: 'Performance Metrics', level: 2, page: 19 },
      { id: '12', title: 'Discussion', level: 1, page: 22 },
      { id: '13', title: 'Future Work and Limitations', level: 2, page: 24 },
      { id: '14', title: 'Conclusion', level: 1, page: 26 },
      { id: '15', title: 'References', level: 1, page: 28 }
    ]
  };

  // Initialize with first document from props or mock document
  useEffect(() => {
    if (documents && documents.length > 0 && !currentDocument) {
      setCurrentDocument(documents[0]);
    } else if (!currentDocument && !documents) {
      setCurrentDocument(mockDocument);
    }
  }, [documents, currentDocument]);

  // Load related sections when page or document changes
  useEffect(() => {
    if (currentDocument && persona && jobToBeDone) {
      loadRelatedSections();
    }
  }, [currentDocument, currentPage, persona, jobToBeDone]);

  const loadRelatedSections = async () => {
    if (!currentDocument || !persona || !jobToBeDone) return;
    
    setIsLoadingRelated(true);
    try {
      const documentIds = documents ? documents.map(d => d.id) : [currentDocument.id];
      const currentSection = getCurrentSectionTitle();
      
      const related = await apiService.getRelatedSections(
        documentIds,
        currentPage,
        currentSection,
        persona,
        jobToBeDone
      );
      
      setRelatedSections(related);
      
      // Convert to highlights for display
      const newHighlights: Highlight[] = related.slice(0, 3).map((section, index) => ({
        id: `related-${section.page_number}-${index}`,
        text: section.section_title,
        page: section.page_number,
        color: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'tertiary',
        relevanceScore: section.relevance_score,
        explanation: section.explanation
      }));
      
      setHighlights(newHighlights);
      
    } catch (error) {
      console.error('Failed to load related sections:', error);
      toast({
        title: "Failed to load related content",
        description: "Unable to find related sections. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRelated(false);
    }
  };

  const getCurrentSectionTitle = (): string => {
    if (!currentDocument) return "";
    
    // Find the section title for the current page
    const currentOutlineItem = currentDocument.outline
      .filter(item => item.page <= currentPage)
      .sort((a, b) => b.page - a.page)[0];
    
    return currentOutlineItem?.title || "";
  };

  const generateInsightsForText = async (text: string) => {
    if (!persona || !jobToBeDone) return;
    
    try {
      const insights = await apiService.generateInsights(
        text,
        persona,
        jobToBeDone,
        currentDocument?.id
      );
      
      setCurrentInsights(insights);
      
      // Auto-switch to insights panel if not already there
      if (activeRightPanel !== 'insights') {
        setActiveRightPanel('insights');
      }
      
    } catch (error) {
      console.error('Failed to generate insights for selected text:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      // In a real implementation, you would upload the file and extract outline
      const newDoc: PDFDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        outline: [] // Would be extracted from the PDF
      };
      setCurrentDocument(newDoc);
      setCurrentPage(1);
      setHighlights([]);
    }
  };

  const handleOutlineClick = (item: OutlineItem) => {
    setCurrentPage(item.page);
  };

  const handleHighlight = (highlight: Highlight) => {
    setHighlights(prev => [...prev, highlight]);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border-subtle bg-surface-elevated/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-6">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-2 hover:bg-surface-hover"
              >
                ←
                Back
              </Button>
            )}
            
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-brand-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">DocuSense</h1>
                {persona && (
                  <p className="text-sm text-text-secondary font-medium">
                    {persona} • {jobToBeDone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="gap-2 hover:bg-surface-hover"
              aria-label="Toggle outline"
            >
              <Menu className="h-4 w-4" />
              Outline
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="gap-2 hover:bg-surface-hover"
              aria-label="Toggle utilities"
            >
              <Settings className="h-4 w-4" />
              Tools
            </Button>
            
            <div className="h-6 w-px bg-border-subtle mx-2" />
            
            <ThemeToggle />
          </div>
        </div>
        
        {/* Reading Progress Bar */}
        {currentDocument && (
          <div className="px-8 pb-4">
            <ReadingProgressBar
              currentPage={currentPage}
              totalPages={totalPages}
              timeSpent={getReadingStats().timeSpent}
              estimatedRemaining={getReadingStats().remainingTime}
              progressPercentage={getReadingStats().progressPercentage}
              formatTime={formatTime}
            />
          </div>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Outline & Navigation */}
        {leftSidebarOpen && (
          <aside className="w-80 bg-surface-elevated/50 border-r border-border-subtle flex flex-col animate-fade-in backdrop-blur-sm">
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Document Outline */}
              {currentDocument && (
                <div className="flex-1">
                  <DocumentOutline
                    outline={currentDocument.outline}
                    currentPage={currentPage}
                    onItemClick={handleOutlineClick}
                  />
                </div>
              )}
              
              {/* Related Sections */}
              <div className="border-t border-border-subtle max-h-80">
                <HighlightPanel 
                  highlights={highlights}
                  onHighlightClick={(highlight) => setCurrentPage(highlight.page)}
                />
              </div>
            </div>
          </aside>
        )}

        {/* Main PDF Viewer */}
        <main className="flex-1 relative">
          {currentDocument ? (
            <AdobePDFViewer
              documentUrl={currentDocument.url}
              documentName={currentDocument.name}
              onPageChange={setCurrentPage}
              onTextSelection={(text, page) => {
                console.log('Text selected:', text, 'on page:', page);
                setSelectedText(text);
                setCurrentPage(page);
                // Automatically generate insights for selected text
                if (text.length > 50) {
                  generateInsightsForText(text);
                }
              }}
              clientId={import.meta.env.VITE_ADOBE_CLIENT_ID}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <BookOpen className="h-16 w-16 text-text-tertiary mx-auto" />
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    No PDF loaded
                  </h2>
                  <p className="text-text-secondary">
                    Upload a PDF file to get started with intelligent reading
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Floating Tools */}
          <FloatingTools
            currentDocument={currentDocument}
            currentPage={currentPage}
            onHighlight={handleHighlight}
          />
        </main>

        {/* Right Panel - Interactive Utilities */}
        {rightPanelOpen && (
          <aside className="w-96 bg-surface-elevated/50 border-l border-border-subtle flex flex-col animate-fade-in backdrop-blur-sm">
            <div className="p-5 border-b border-border-subtle">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'insights', label: 'Insights', icon: BookOpen },
                  { key: 'podcast', label: 'Podcast', icon: Settings },
                  { key: 'accessibility', label: 'Access', icon: Palette },
                  { key: 'simplifier', label: 'Simplify', icon: Upload },
                  { key: 'export', label: 'Export', icon: Upload }
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={activeRightPanel === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveRightPanel(activeRightPanel === key ? null : key as any)}
                    className="gap-2 h-10 justify-start"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeRightPanel === 'insights' && (
                <InsightsPanel 
                  documentId={currentDocument?.id}
                  persona={persona}
                  jobToBeDone={jobToBeDone}
                  currentText={selectedText || getCurrentSectionTitle()}
                />
              )}
              
              {activeRightPanel === 'podcast' && (
                <PodcastPanel 
                  documentId={currentDocument?.id}
                  currentPage={currentPage}
                  currentText={selectedText || getCurrentSectionTitle()}
                  relatedSections={relatedSections.map(r => r.section_title)}
                  insights={currentInsights.map(i => i.content)}
                />
              )}
              
              {activeRightPanel === 'accessibility' && <AccessibilityPanel />}
              
              {activeRightPanel === 'simplifier' && (
                <TextSimplifier 
                  originalText={selectedText || getCurrentSectionTitle()}
                  onSimplifiedText={(text) => console.log('Simplified:', text)}
                />
              )}

              {activeRightPanel === 'export' && (
                <CopyDownloadPanel
                  selectedText={selectedText}
                  currentSection={getCurrentSectionTitle()}
                  documentTitle={currentDocument?.name}
                  insights={currentInsights}
                  relatedSections={relatedSections.map(r => ({
                    section_title: r.section_title,
                    explanation: r.explanation
                  }))}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}