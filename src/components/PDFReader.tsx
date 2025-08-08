import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentOutline } from './DocumentOutline';
import { FloatingTools } from './FloatingTools';
import { PDFViewer } from './PDFViewer';
import { ThemeToggle } from './ThemeToggle';
import { AccessibilityPanel } from './AccessibilityPanel';
import { InsightsPanel } from './InsightsPanel';
import { PodcastPanel } from './PodcastPanel';
import { HighlightPanel } from './HighlightPanel';
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

export function PDFReader() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDocument, setCurrentDocument] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activePanel, setActivePanel] = useState<'outline' | 'insights' | 'podcast' | 'accessibility' | 'highlights' | null>('outline');

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

  // Initialize with mock document
  if (!currentDocument) {
    setCurrentDocument(mockDocument);
  }

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
      <header className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface-elevated">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-primary" />
            <h1 className="text-lg font-semibold text-text-primary">PDF Reader</h1>
          </div>
          
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload PDF file"
            />
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload PDF
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivePanel(activePanel === 'accessibility' ? null : 'accessibility')}
            className="p-2"
            aria-label="Accessibility settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivePanel(activePanel === 'highlights' ? null : 'highlights')}
            className="p-2"
            aria-label="Theme settings"
          >
            <Palette className="h-4 w-4" />
          </Button>
          
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-80 bg-outline-background border-r border-border-subtle flex flex-col animate-fade-in">
            <div className="p-4 border-b border-border-subtle">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  { key: 'outline', label: 'Outline', icon: Menu },
                  { key: 'insights', label: 'Insights', icon: BookOpen },
                  { key: 'podcast', label: 'Podcast', icon: Settings }
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={activePanel === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActivePanel(activePanel === key ? null : key as any)}
                    className="gap-2 whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {activePanel === 'outline' && currentDocument && (
                <DocumentOutline
                  outline={currentDocument.outline}
                  currentPage={currentPage}
                  onItemClick={handleOutlineClick}
                />
              )}
              
              {activePanel === 'insights' && (
                <InsightsPanel documentId={currentDocument?.id} />
              )}
              
              {activePanel === 'podcast' && (
                <PodcastPanel 
                  documentId={currentDocument?.id}
                  currentPage={currentPage}
                />
              )}
            </div>
          </aside>
        )}

        {/* Main PDF Viewer */}
        <main className="flex-1 relative">
          {currentDocument ? (
            <PDFViewer
              document={currentDocument}
              currentPage={currentPage}
              zoom={zoom}
              onPageChange={setCurrentPage}
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

        {/* Right Panel */}
        {(activePanel === 'accessibility' || activePanel === 'highlights') && (
          <aside className="w-80 bg-surface-elevated border-l border-border-subtle animate-fade-in">
            {activePanel === 'accessibility' && <AccessibilityPanel />}
            {activePanel === 'highlights' && (
              <HighlightPanel 
                highlights={highlights}
                onHighlightClick={(highlight) => setCurrentPage(highlight.page)}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}