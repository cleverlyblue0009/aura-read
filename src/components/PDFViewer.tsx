import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  RotateCw,
  Maximize2,
  Download,
  Search
} from 'lucide-react';
import { PDFDocument, Highlight } from './PDFReader';

interface PDFViewerProps {
  document: PDFDocument;
  currentPage: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight) => void;
}

export function PDFViewer({
  document,
  currentPage,
  zoom,
  onPageChange,
  onZoomChange,
  highlights,
  onHighlight
}: PDFViewerProps) {
  const [totalPages] = useState(30); // Mock total pages
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Mock PDF rendering - in real implementation, would use Adobe PDF Embed API
  useEffect(() => {
    // Initialize Adobe PDF Embed API here
    console.log('Loading PDF:', document.url);
  }, [document.url]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 0.25, 0.5));
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
      // Show highlight options
    }
  };

  const handleHighlightText = (color: 'primary' | 'secondary' | 'tertiary') => {
    if (!selectedText) return;

    const highlight: Highlight = {
      id: `highlight-${Date.now()}`,
      text: selectedText,
      page: currentPage,
      color,
      relevanceScore: 0.85,
      explanation: 'User highlighted text'
    };

    onHighlight(highlight);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="h-full flex flex-col bg-pdf-background">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between p-3 bg-surface-elevated border-b border-border-subtle">
        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }}
              className="w-16 px-2 py-1 text-center border border-border-subtle rounded bg-background text-text-primary"
              min={1}
              max={totalPages}
            />
            <span className="text-text-secondary">of {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-32">
              <Slider
                value={[zoom * 100]}
                onValueChange={([value]) => onZoomChange(value / 100)}
                min={50}
                max={300}
                step={25}
                className="flex-1"
              />
              <span className="text-xs text-text-secondary font-mono w-12">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3.0}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Additional Tools */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('Rotate page')}
              aria-label="Rotate page"
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label="Toggle fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('Search in document')}
              aria-label="Search document"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('Download document')}
              aria-label="Download document"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 overflow-auto relative">
        <div 
          className="pdf-canvas mx-auto my-8 relative"
          style={{ 
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            minHeight: '11in',
            width: '8.5in',
            backgroundColor: 'white'
          }}
          onMouseUp={handleTextSelection}
        >
          {/* Mock PDF Content */}
          <div className="p-8 text-gray-900 space-y-6">
            <header className="text-center border-b pb-6">
              <h1 className="text-2xl font-bold mb-2">
                Artificial Intelligence in Healthcare
              </h1>
              <p className="text-lg text-gray-600">
                A Comprehensive Research Study
              </p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Dr. Sarah Johnson, PhD • Medical AI Research Institute</p>
                <p>Published: November 2024 • Page {currentPage} of {totalPages}</p>
              </div>
            </header>

            {currentPage === 1 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Abstract</h2>
                <p className="text-sm leading-relaxed mb-4">
                  This comprehensive study examines the implementation and impact of artificial intelligence 
                  technologies in modern healthcare systems. Through extensive research and clinical trials, 
                  we demonstrate that <span className="highlight-primary">machine learning algorithms achieve 
                  94% accuracy in diagnostic imaging applications</span>, significantly improving patient 
                  outcomes while reducing diagnostic time by up to 60%.
                </p>
                <p className="text-sm leading-relaxed">
                  Our findings indicate that AI integration faces several challenges, including 
                  <span className="highlight-secondary">data privacy concerns and regulatory compliance 
                  requirements</span> that must be addressed for widespread adoption. However, the potential 
                  benefits far outweigh these limitations, particularly in areas of early disease detection 
                  and personalized treatment planning.
                </p>
              </section>
            )}

            {currentPage === 2 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Introduction</h2>
                <p className="text-sm leading-relaxed mb-4">
                  The healthcare industry stands at the precipice of a technological revolution. Artificial 
                  intelligence, once confined to the realm of science fiction, now represents one of the most 
                  promising avenues for improving patient care and medical outcomes.
                </p>
                <p className="text-sm leading-relaxed mb-4">
                  <span className="highlight-tertiary">Integration with existing EHR systems requires 
                  standardized protocols</span> to ensure seamless data flow and maintain interoperability 
                  across different healthcare providers. This standardization is crucial for the success 
                  of AI implementation at scale.
                </p>
                <p className="text-sm leading-relaxed">
                  Current research focuses on three primary areas: diagnostic imaging, predictive analytics, 
                  and personalized medicine. Each of these domains presents unique opportunities and challenges 
                  that we will explore in detail throughout this paper.
                </p>
              </section>
            )}

            {currentPage > 2 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Chapter {currentPage - 1}</h2>
                <p className="text-sm leading-relaxed mb-4">
                  This section would contain the actual content from page {currentPage} of the research paper. 
                  In a real implementation, this content would be rendered by the Adobe PDF Embed API with 
                  full fidelity to the original document formatting.
                </p>
                <p className="text-sm leading-relaxed">
                  The content would include proper typography, figures, charts, and all other elements 
                  exactly as they appear in the original PDF document.
                </p>
              </section>
            )}
          </div>

          {/* Highlight Overlays */}
          {highlights
            .filter(h => h.page === currentPage)
            .map(highlight => (
              <div
                key={highlight.id}
                className={`absolute highlight-${highlight.color} rounded-sm opacity-30 pointer-events-none`}
                style={{
                  // Position would be calculated based on text selection
                  top: '20%',
                  left: '10%',
                  right: '10%',
                  height: '1.5em'
                }}
                title={`${highlight.explanation} (${Math.round(highlight.relevanceScore * 100)}% relevant)`}
              />
            ))}
        </div>
      </div>

      {/* Selection Highlight Tools */}
      {selectedText && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 floating-tool p-3 animate-scale-in">
          <p className="text-xs text-text-secondary mb-2">Highlight selected text:</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleHighlightText('primary')}
              className="bg-highlight-primary text-gray-900 hover:bg-highlight-primary/80"
            >
              Yellow
            </Button>
            <Button
              size="sm"
              onClick={() => handleHighlightText('secondary')}
              className="bg-highlight-secondary text-gray-900 hover:bg-highlight-secondary/80"
            >
              Green
            </Button>
            <Button
              size="sm"
              onClick={() => handleHighlightText('tertiary')}
              className="bg-highlight-tertiary text-gray-900 hover:bg-highlight-tertiary/80"
            >
              Blue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}