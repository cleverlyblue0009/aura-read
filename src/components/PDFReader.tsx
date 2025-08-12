import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentOutline } from './DocumentOutline';
import { FloatingTools } from './FloatingTools';
import { AdobePDFViewer, FallbackPDFViewer } from './AdobePDFViewer';

// Hybrid PDF Viewer component that tries Adobe first, then falls back to iframe
function HybridPDFViewer({ 
  documentUrl, 
  documentName, 
  onPageChange, 
  onTextSelection, 
  clientId 
}: {
  documentUrl: string;
  documentName: string;
  onPageChange?: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
  clientId?: string;
}) {
  const [useAdobeViewer, setUseAdobeViewer] = useState(true);
  const [adobeFailed, setAdobeFailed] = useState(false);

  const handleAdobeError = () => {
    console.log("Adobe PDF viewer failed, falling back to iframe viewer");
    setAdobeFailed(true);
    setUseAdobeViewer(false);
  };

  if (!useAdobeViewer || adobeFailed) {
    return <FallbackPDFViewer documentUrl={documentUrl} documentName={documentName} />;
  }

  return (
    <div className="h-full relative">
      <AdobePDFViewer
        documentUrl={documentUrl}
        documentName={documentName}
        onPageChange={onPageChange}
        onTextSelection={onTextSelection}
        clientId={clientId}
      />
      {/* Fallback button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUseAdobeViewer(false)}
          className="bg-background/90 backdrop-blur-sm"
        >
          Use Simple Viewer
        </Button>
      </div>
    </div>
  );
}

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
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  context?: string;
  timestamp: number;
  isUserCreated: boolean;
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
  const [highlightMode, setHighlightMode] = useState<'automatic' | 'manual'>('automatic');
  const [isHighlighting, setIsHighlighting] = useState(false);
  const { toast } = useToast();

  // Performance optimization refs
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const relatedSectionsCache = useRef<Map<string, RelatedSection[]>>(new Map());
  const lastNavigationTime = useRef<number>(0);

  // Performance monitoring and optimization
  const performanceMetrics = useRef({
    navigationTimes: [] as number[],
    highlightCreationTimes: [] as number[],
    insightGenerationTimes: [] as number[]
  });

  // Performance monitoring hook
  useEffect(() => {
    const logPerformanceMetrics = () => {
      const metrics = performanceMetrics.current;
      if (metrics.navigationTimes.length > 0) {
        const avgNavigation = metrics.navigationTimes.reduce((a, b) => a + b, 0) / metrics.navigationTimes.length;
        console.log(`Average navigation time: ${avgNavigation.toFixed(2)}ms`);
        
        if (avgNavigation > 2000) {
          console.warn('Navigation performance is slower than target (<2s)');
        }
      }
    };

    // Log metrics every 30 seconds
    const interval = setInterval(logPerformanceMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Preload next pages for faster navigation
  useEffect(() => {
    if (currentDocument && currentPage < totalPages) {
      // Preload next 2 pages in background
      const preloadPages = [currentPage + 1, currentPage + 2].filter(page => page <= totalPages);
      
      preloadPages.forEach(page => {
        const cacheKey = `${currentDocument.id}-${page}-${persona}-${jobToBeDone}`;
        if (!relatedSectionsCache.current.has(cacheKey)) {
          // Preload in background without showing loading state
          setTimeout(() => {
            loadRelatedSections();
          }, 1000);
        }
      });
    }
  }, [currentDocument, currentPage, totalPages, persona, jobToBeDone, loadRelatedSections]);

  // Reading progress tracking
  const { getReadingStats, formatTime } = useReadingProgress({
    documentId: currentDocument?.id,
    currentPage,
    totalPages,
    isReading: isActivelyReading
  });

  // Memoized current section title calculation
  const currentSectionTitle = useMemo(() => {
    if (!currentDocument) return "";
    
    const currentOutlineItem = currentDocument.outline
      .filter(item => item.page <= currentPage)
      .sort((a, b) => b.page - a.page)[0];
    
    return currentOutlineItem?.title || "";
  }, [currentDocument, currentPage]);

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

  // Optimized related sections loading with caching and debouncing
  const loadRelatedSections = useCallback(async (force = false) => {
    if (!currentDocument || !persona || !jobToBeDone) return;
    
    const cacheKey = `${currentDocument.id}-${currentPage}-${persona}-${jobToBeDone}`;
    
    // Check cache first
    if (!force && relatedSectionsCache.current.has(cacheKey)) {
      const cached = relatedSectionsCache.current.get(cacheKey)!;
      setRelatedSections(cached);
      return;
    }
    
    // Debounce rapid navigation
    const now = Date.now();
    if (now - lastNavigationTime.current < 500) {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      
      navigationTimeoutRef.current = setTimeout(() => {
        loadRelatedSections(force);
      }, 300);
      return;
    }
    
    lastNavigationTime.current = now;
    setIsLoadingRelated(true);
    
    try {
      const documentIds = documents ? documents.map(d => d.id) : [currentDocument.id];
      const currentSection = currentSectionTitle;
      
      const related = await apiService.getRelatedSections(
        documentIds,
        currentPage,
        currentSection,
        persona,
        jobToBeDone
      );
      
      // Cache the results
      relatedSectionsCache.current.set(cacheKey, related);
      
      // Limit cache size to prevent memory issues
      if (relatedSectionsCache.current.size > 50) {
        const firstKey = relatedSectionsCache.current.keys().next().value;
        relatedSectionsCache.current.delete(firstKey);
      }
      
      setRelatedSections(related);
      
      // Trigger automatic highlighting for high-relevance sections
      if (highlightMode === 'automatic' && related.length > 0) {
        setTimeout(() => {
          performAutomaticHighlighting();
        }, 100);
      }
      
    } catch (error) {
      console.error('Failed to load related sections:', error);
      toast({
        title: "Failed to load related content",
        description: "Unable to find related sections. Please try again.",
        variant: "destructive"
      });
      setRelatedSections([]);
    } finally {
      setIsLoadingRelated(false);
    }
  }, [currentDocument, currentPage, currentSectionTitle, persona, jobToBeDone, documents, highlightMode, performAutomaticHighlighting, toast]);

  // Optimized outline click handler
  const handleOutlineClick = useCallback((item: OutlineItem) => {
    // Immediate visual feedback
    const startTime = performance.now();
    
    // Update page immediately for responsive feel
    setCurrentPage(item.page);
    
    // Show loading state for complex operations
    if (Math.abs(item.page - currentPage) > 3) {
      setIsLoadingRelated(true);
    }
    
    // Defer heavy operations
    requestAnimationFrame(() => {
      loadRelatedSections();
      
      const endTime = performance.now();
      const navigationTime = endTime - startTime;
      
      // Performance monitoring
      if (navigationTime > 2000) {
        console.warn(`Slow navigation detected: ${navigationTime}ms`);
      }
    });
  }, [currentPage, loadRelatedSections]);

  // Memoized insights generation
  const generateInsightsForText = useCallback(async (text: string) => {
    if (!persona || !jobToBeDone || text.length < 50) return;
    
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
      
    } catch (error) {
      console.error('Failed to generate insights for selected text:', error);
    }
  }, [persona, jobToBeDone, currentDocument?.id]);

  // Enhanced highlight creation with better accuracy
  const createEnhancedHighlight = async (text: string, page: number, position?: any, isUserCreated: boolean = false): Promise<Highlight | null> => {
    if (!text || text.trim().length < 5) {
      return null;
    }

    const cleanText = text.trim();
    const wordCount = cleanText.split(/\s+/).length;
    
    // Skip very short or very long selections
    if (wordCount < 2 || wordCount > 100) {
      return null;
    }

    let relevanceScore = 0.5; // Base score
    let explanation = 'User highlighted text';
    let color: 'primary' | 'secondary' | 'tertiary' = 'primary';

    if (!isUserCreated && persona && jobToBeDone) {
      // Calculate relevance using AI-based scoring
      try {
        const insights = await apiService.generateInsights(
          cleanText,
          persona,
          jobToBeDone,
          currentDocument?.id
        );

        if (insights && insights.length > 0) {
          // Determine relevance based on insight types
          const hasImportantInsight = insights.some(insight => 
            insight.type === 'takeaway' || insight.type === 'fact'
          );
          const hasConnectionInsight = insights.some(insight => 
            insight.type === 'connection'
          );

          if (hasImportantInsight) {
            relevanceScore = 0.9;
            color = 'primary';
            explanation = 'Contains key information relevant to your analysis';
          } else if (hasConnectionInsight) {
            relevanceScore = 0.8;
            color = 'secondary';
            explanation = 'Connects to broader concepts in your field';
          } else {
            relevanceScore = 0.7;
            color = 'tertiary';
            explanation = 'Provides supporting context for your work';
          }
        }
      } catch (error) {
        console.warn('Failed to analyze highlight relevance:', error);
      }
    } else if (isUserCreated) {
      relevanceScore = 0.95; // User highlights are highly relevant
      explanation = 'User highlighted for importance';
    }

    // Boost relevance for content with specific keywords
    const importantKeywords = ['conclusion', 'result', 'finding', 'important', 'significant', 'key', 'critical'];
    const lowerText = cleanText.toLowerCase();
    
    if (importantKeywords.some(keyword => lowerText.includes(keyword))) {
      relevanceScore = Math.min(1.0, relevanceScore + 0.1);
    }

    const highlight: Highlight = {
      id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: cleanText,
      page,
      color,
      relevanceScore,
      explanation,
      position,
      context: currentSectionTitle,
      timestamp: Date.now(),
      isUserCreated
    };

    return highlight;
  };

  // Enhanced automatic highlighting based on relevance
  const performAutomaticHighlighting = async () => {
    if (!currentDocument || !persona || !jobToBeDone || relatedSections.length === 0) {
      return;
    }

    setIsHighlighting(true);
    const newHighlights: Highlight[] = [];

    try {
      // Process top related sections for automatic highlighting
      for (const section of relatedSections.slice(0, 5)) {
        if (section.relevance_score >= 0.8) {
          const highlight = await createEnhancedHighlight(
            section.section_title,
            section.page_number,
            undefined,
            false
          );
          
          if (highlight) {
            newHighlights.push(highlight);
          }
        }
      }

      // Add highlights with animation
      for (let i = 0; i < newHighlights.length; i++) {
        setTimeout(() => {
          setHighlights(prev => {
            const existing = prev.find(h => h.text === newHighlights[i].text && h.page === newHighlights[i].page);
            if (existing) return prev;
            return [...prev, newHighlights[i]];
          });
        }, i * 200); // Stagger the highlighting animation
      }

      if (newHighlights.length > 0) {
        toast({
          title: "Smart highlights added",
          description: `Found ${newHighlights.length} relevant sections based on your role and task.`,
          variant: "default"
        });
      }

    } catch (error) {
      console.error('Automatic highlighting failed:', error);
    } finally {
      setIsHighlighting(false);
    }
  };

  // Optimized text selection handler with performance tracking
  const handleTextSelection = useCallback(async (text: string, page: number) => {
    const startTime = performance.now();
    
    console.log('Text selected:', text, 'on page:', page);
    setSelectedText(text);
    setCurrentPage(page);
    
    if (text.length >= 10) {
      // Create highlight asynchronously to avoid blocking UI
      requestIdleCallback(async () => {
        const highlight = await createEnhancedHighlight(text, page, undefined, true);
        
        if (highlight) {
          setHighlights(prev => [...prev, highlight]);
          
          const endTime = performance.now();
          const processingTime = endTime - startTime;
          
          toast({
            title: "Highlight created",
            description: `Added highlight on page ${page} (${processingTime.toFixed(0)}ms)`,
            variant: "default"
          });
        }
      });
    }
    
    // Generate insights for substantial text selections
    if (text.length > 50) {
      requestIdleCallback(() => {
        generateInsightsForText(text);
      });
    }
  }, [createEnhancedHighlight, generateInsightsForText, toast]);

  // Performance-optimized highlight click with smooth navigation
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    const startTime = performance.now();
    
    // Immediate page change for responsiveness
    setCurrentPage(highlight.page);
    
    // Smooth scroll to highlight if position is available
    if (highlight.position) {
      // Use CSS scroll-behavior for smooth scrolling
      document.documentElement.style.scrollBehavior = 'smooth';
      setTimeout(() => {
        document.documentElement.style.scrollBehavior = 'auto';
      }, 1000);
    }
    
    const endTime = performance.now();
    const navigationTime = endTime - startTime;
    
    toast({
      title: "Navigating to highlight",
      description: `Jumped to page ${highlight.page} (${navigationTime.toFixed(0)}ms)`,
      variant: "default"
    });
  }, [toast]);

  // Remove highlight with confirmation for important ones
  const handleRemoveHighlight = (highlightId: string) => {
    const highlight = highlights.find(h => h.id === highlightId);
    
    if (highlight && highlight.relevanceScore >= 0.9) {
      // Show confirmation for highly relevant highlights
      if (!confirm('This highlight seems very relevant. Are you sure you want to remove it?')) {
        return;
      }
    }
    
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
    
    toast({
      title: "Highlight removed",
      description: "The highlight has been deleted.",
      variant: "default"
    });
  };

  // Load related sections when page or document changes (optimized)
  useEffect(() => {
    if (currentDocument && persona && jobToBeDone) {
      loadRelatedSections();
    }
  }, [currentDocument, persona, jobToBeDone, loadRelatedSections]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
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
              
              {/* Related Sections */}
              <div className="border-t border-border-subtle max-h-80">
                <HighlightPanel 
                  highlights={highlights}
                  onHighlightClick={(highlight) => handleHighlightClick(highlight)}
                  onRemoveHighlight={handleRemoveHighlight}
                />
              </div>
            </div>
          </aside>
        )}

        {/* Main PDF Viewer */}
        <main className="flex-1 relative">
          {currentDocument ? (
            <HybridPDFViewer
              documentUrl={currentDocument.url}
              documentName={currentDocument.name}
              onPageChange={setCurrentPage}
              onTextSelection={handleTextSelection}
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
            onHighlight={(highlight) => setHighlights(prev => [...prev, highlight])}
          />
        </main>

        {/* Enhanced Right Panel - Interactive Utilities */}
        {rightPanelOpen && (
          <aside className="w-96 bg-surface-elevated/50 border-l border-border-subtle flex flex-col animate-slide-in-right backdrop-blur-sm custom-scrollbar glass">
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
                  currentText={selectedText || currentSectionTitle}
                  onPageNavigate={setCurrentPage}
                />
              )}
              
              {activeRightPanel === 'podcast' && (
                <PodcastPanel 
                  documentId={currentDocument?.id}
                  currentPage={currentPage}
                  currentText={selectedText || currentSectionTitle}
                  relatedSections={relatedSections.map(r => r.section_title)}
                  insights={currentInsights.map(i => i.content)}
                />
              )}
              
              {activeRightPanel === 'accessibility' && (
                <AccessibilityPanel 
                  currentText={selectedText || currentSectionTitle}
                  onLanguageChange={(language) => {
                    setCurrentLanguage(language);
                    // Here you could add logic to translate content or change UI language
                    console.log('Language changed to:', language);
                  }}
                />
              )}
              
              {activeRightPanel === 'simplifier' && (
                <TextSimplifier 
                  originalText={selectedText || currentSectionTitle}
                  onSimplifiedText={(text) => console.log('Simplified:', text)}
                />
              )}

              {activeRightPanel === 'export' && (
                <CopyDownloadPanel
                  selectedText={selectedText}
                  currentSection={currentSectionTitle}
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