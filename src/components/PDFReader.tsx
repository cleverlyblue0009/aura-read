import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentOutline } from './DocumentOutline';
import { FloatingTools } from './FloatingTools';
import { PDFViewer } from './PDFViewer';
import { PerformanceMonitor } from './PerformanceMonitor';

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
  Palette,
  Target,
  Star
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
  const [totalPages, setTotalPages] = useState(30);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const { toast } = useToast();

  // Reading progress tracking
  const { getReadingStats, formatTime } = useReadingProgress({
    documentId: currentDocument?.id,
    currentPage,
    totalPages,
    isReading: isActivelyReading
  });

  // Initialize with first document from props or mock document
  useEffect(() => {
    if (documents && documents.length > 0 && !currentDocument) {
      setCurrentDocument(documents[0]);
      
      // Add some sample highlights to demonstrate the feature
      const sampleHighlights: Highlight[] = [
        {
          id: 'sample-1',
          text: 'This is an important concept that relates to the main topic of the document.',
          page: 1,
          color: 'primary',
          relevanceScore: 0.95,
          explanation: 'Key concept relevant to your analysis'
        },
        {
          id: 'sample-2', 
          text: 'Supporting evidence and data that reinforces the primary arguments.',
          page: 2,
          color: 'secondary',
          relevanceScore: 0.87,
          explanation: 'Supporting evidence for main thesis'
        },
        {
          id: 'sample-3',
          text: 'Critical analysis point that requires further consideration.',
          page: 3,
          color: 'tertiary',
          relevanceScore: 0.82,
          explanation: 'Requires deeper analysis for your job role'
        }
      ];
      
      setHighlights(sampleHighlights);
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
    const startTime = performance.now();
    
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
      
      // Convert to highlights for display - only if we have real data
      if (related && related.length > 0) {
        const newHighlights: Highlight[] = related.slice(0, 5).map((section, index) => ({
          id: `related-${section.page_number}-${index}`,
          text: section.section_title,
          page: section.page_number,
          color: ['primary', 'secondary', 'tertiary'][index % 3] as 'primary' | 'secondary' | 'tertiary',
          relevanceScore: section.relevance_score,
          explanation: section.explanation
        }));
        
        setHighlights(newHighlights);
      }
      
      // Measure API response time
      const responseTime = performance.now() - startTime;
      (window as any).performanceMonitor?.measureApiResponse(responseTime);
      
    } catch (error) {
      console.error('Failed to load related sections:', error);
      toast({
        title: "Failed to load related content",
        description: "Unable to find related sections. Please try again.",
        variant: "destructive"
      });
      setHighlights([]);
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
    
    const startTime = performance.now();
    
    try {
      const insights = await apiService.generateInsights(
        text,
        persona,
        jobToBeDone,
        currentDocument?.id
      );
      
      setCurrentInsights(insights.map(insight => ({
        type: insight.type,
        content: insight.content
      })));
      
      // Measure API response time
      const responseTime = performance.now() - startTime;
      (window as any).performanceMonitor?.measureApiResponse(responseTime);
      
    } catch (error) {
      console.error('Failed to generate insights for selected text:', error);
    }
  };

  const handleOutlineClick = (item: OutlineItem) => {
    const startTime = performance.now();
    
    // Add to navigation history
    setNavigationHistory(prev => [...prev, currentPage]);
    setCurrentPage(item.page);
    
    // Measure navigation time
    requestAnimationFrame(() => {
      (window as any).performanceMonitor?.measureNavigation(startTime);
    });
  };

  const handleHighlight = (highlight: Highlight) => {
    setHighlights(prev => [...prev, highlight]);
  };

  // Enhanced navigation with history tracking and performance monitoring
  const handleNavigateToPage = useCallback((page: number) => {
    if (page !== currentPage) {
      const startTime = performance.now();
      
      setNavigationHistory(prev => [...prev, currentPage]);
      setCurrentPage(page);
      
      // Measure navigation time
      requestAnimationFrame(() => {
        (window as any).performanceMonitor?.measureNavigation(startTime);
      });
      
      toast({
        title: "Navigated to page",
        description: `Jumped to page ${page}`,
      });
    }
  }, [currentPage, toast]);

  // Create highlight from selected text
  const createHighlightFromSelection = (text: string, page: number, color: 'primary' | 'secondary' | 'tertiary' = 'primary') => {
    if (!text || text.trim().length < 10) return;

    const highlight: Highlight = {
      id: `user-highlight-${Date.now()}`,
      text: text.trim(),
      page,
      color,
      relevanceScore: 0.9,
      explanation: 'User highlighted text'
    };

    setHighlights(prev => [...prev, highlight]);
    
    toast({
      title: "Highlight created",
      description: `Added highlight on page ${page}`,
    });
  };

  // Handle highlight click with navigation
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    handleNavigateToPage(highlight.page);
  }, [handleNavigateToPage]);

  // Performance monitoring callback
  const handlePerformanceUpdate = useCallback((metrics: any) => {
    // Update cache hit rate based on API service stats
    const cacheStats = apiService.getCacheStats();
    const hitRate = cacheStats.size > 0 ? 0.7 : 0; // Simplified calculation
    (window as any).performanceMonitor?.updateCacheStats(hitRate);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Enhanced Header with animations */}
      <header className="border-b border-border-subtle bg-surface-elevated/95 backdrop-blur-md shadow-sm animate-slide-in-top">
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
            
            <div className="flex items-center gap-4 animate-bounce-in stagger-1">
              <div className="h-10 w-10 bg-brand-primary/10 rounded-lg flex items-center justify-center hover-lift glass">
                <BookOpen className="h-6 w-6 text-brand-primary animate-float" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">DocuSense</h1>
                {persona && (
                  <p className="text-sm text-text-secondary font-medium animate-slide-in-top stagger-2">
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
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              className="gap-2 hover:bg-surface-hover"
              aria-label="Toggle performance monitor"
            >
              <Target className="h-4 w-4" />
              Performance
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
        {/* Enhanced Left Sidebar - Outline & Navigation */}
        {leftSidebarOpen && (
          <aside className="w-80 bg-surface-elevated/50 border-r border-border-subtle flex flex-col animate-slide-in-left backdrop-blur-sm custom-scrollbar glass">
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
              
              {/* Enhanced Highlights Panel */}
              <div className="border-t border-border-subtle max-h-80">
                <HighlightPanel 
                  highlights={highlights}
                  onHighlightClick={handleHighlightClick}
                  onNavigateToPage={handleNavigateToPage}
                  currentPage={currentPage}
                />
              </div>
            </div>
          </aside>
        )}

        {/* Enhanced Main PDF Viewer */}
        <main className="flex-1 relative">
          {currentDocument ? (
            <PDFViewer
              document={currentDocument}
              currentPage={currentPage}
              zoom={zoom}
              onPageChange={handleNavigateToPage}
              onZoomChange={setZoom}
              highlights={highlights}
              onHighlight={handleHighlight}
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

        {/* Enhanced Right Panel - Interactive Utilities */}
        {rightPanelOpen && (
          <aside className="w-96 bg-surface-elevated/50 border-l border-border-subtle flex flex-col animate-slide-in-right backdrop-blur-sm custom-scrollbar glass">
            <div className="p-5 border-b border-border-subtle">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'insights', label: 'Insights', icon: Star },
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
                  onPageNavigate={handleNavigateToPage}
                />
              )}
              
              {activeRightPanel === 'podcast' && (
                <PodcastPanel 
                  documentId={currentDocument?.id}
                  currentPage={currentPage}
                  currentText={selectedText || getCurrentSectionTitle()}
                  relatedSections={relatedSections.map(r => r.section_title)}
                  insights={currentInsights.map(i => i.content)}
                  onNavigateToPage={handleNavigateToPage}
                />
              )}
              
              {activeRightPanel === 'accessibility' && (
                <AccessibilityPanel 
                  currentText={selectedText || getCurrentSectionTitle()}
                  onLanguageChange={(language) => {
                    setCurrentLanguage(language);
                    console.log('Language changed to:', language);
                  }}
                />
              )}
              
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

      {/* Performance Monitor */}
      <PerformanceMonitor 
        onMetricsUpdate={handlePerformanceUpdate}
        showDetails={showPerformanceMonitor}
      />
    </div>
  );
}