import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, FileText, Eye, ArrowRight, Clock, FolderOpen } from 'lucide-react';
import { OutlineItem } from './PDFReader';

interface PDFDocument {
  id: string;
  name: string;
  outline: OutlineItem[];
}

interface DocumentOutlineProps {
  documents: PDFDocument[];
  currentDocument?: PDFDocument;
  currentPage: number;
  onItemClick: (item: OutlineItem) => void;
  onDocumentChange?: (document: PDFDocument) => void;
}

export function DocumentOutline({ 
  documents, 
  currentDocument, 
  currentPage, 
  onItemClick, 
  onDocumentChange 
}: DocumentOutlineProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['root']));
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set(documents.map(d => d.id)));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Optimized toggle function with useCallback
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  }, []);

  const toggleDocumentExpanded = useCallback((docId: string) => {
    setExpandedDocuments(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(docId)) {
        newExpanded.delete(docId);
      } else {
        newExpanded.add(docId);
      }
      return newExpanded;
    });
  }, []);

  // Enhanced item click with smooth navigation
  const handleItemClick = useCallback((item: OutlineItem, document: PDFDocument, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Switch to the document if it's not the current one
    if (currentDocument?.id !== document.id && onDocumentChange) {
      onDocumentChange(document);
    }
    
    // Immediate visual feedback
    const element = event.currentTarget;
    element.classList.add('animate-pulse');
    setTimeout(() => {
      element.classList.remove('animate-pulse');
    }, 200);
    
    // Navigate with smooth transition
    onItemClick(item);
    
    // Auto-expand if has children
    if (item.children && item.children.length > 0) {
      setExpandedItems(prev => new Set([...prev, item.id]));
    }
  }, [onItemClick, onDocumentChange, currentDocument]);

  // Get combined outline from all documents or current document outline
  const displayOutline = currentDocument ? currentDocument.outline : [];

  // Memoized outline processing for performance
  const processedOutline = useMemo(() => {
    return displayOutline.map(item => ({
      ...item,
      isActive: Math.abs(currentPage - item.page) <= 1,
      hasChildren: item.children && item.children.length > 0,
      isExpanded: expandedItems.has(item.id),
      distanceFromCurrent: Math.abs(currentPage - item.page)
    }));
  }, [displayOutline, currentPage, expandedItems]);

  const renderOutlineItem = useCallback((item: OutlineItem, document: PDFDocument, depth = 0) => {
    const isActive = currentDocument?.id === document.id && Math.abs(currentPage - item.page) <= 1;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isHovered = hoveredItem === item.id;
    const distanceFromCurrent = Math.abs(currentPage - item.page);
    
    // Enhanced styling based on proximity and importance
    const getItemStyles = () => {
      let baseClasses = "outline-item flex items-center gap-2 cursor-pointer group transition-all duration-200 hover:bg-surface-hover rounded-md px-2 py-1.5";
      
      if (isActive) {
        baseClasses += " bg-surface-selected border-l-4 border-brand-primary font-medium";
      } else if (distanceFromCurrent <= 3) {
        baseClasses += " bg-surface-elevated/50";
      }
      
      if (isHovered) {
        baseClasses += " shadow-sm";
      }
      
      return baseClasses;
    };

    return (
      <div key={`${document.id}-${item.id}`} className="select-none">
        <div
          className={getItemStyles()}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={(e) => handleItemClick(item, document, e)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          role="button"
          tabIndex={0}
          aria-label={`Navigate to ${item.title} on page ${item.page}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleItemClick(item, document, e as any);
            }
          }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-surface-hover group-hover:bg-surface-active transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <FileText className="h-3 w-3 text-text-tertiary flex-shrink-0" />
            <span className="text-sm truncate font-medium text-text-primary group-hover:text-brand-primary transition-colors">
              {item.title}
            </span>
            <div className="flex items-center gap-1 text-xs text-text-tertiary">
              <span>p.{item.page}</span>
              {isActive && <Eye className="h-3 w-3 text-brand-primary" />}
            </div>
          </div>
          
          {/* Quick navigation hint on hover */}
          {isHovered && (
            <ArrowRight className="h-3 w-3 text-brand-primary animate-bounce-x opacity-70" />
          )}
        </div>

        {/* Render children recursively */}
        {hasChildren && isExpanded && item.children && (
          <div className="ml-2">
            {item.children.map(child => renderOutlineItem(child, document, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [currentPage, currentDocument, expandedItems, hoveredItem, handleItemClick, toggleExpanded]);

  // Calculate reading statistics across all documents
  const readingStats = useMemo(() => {
    const allOutlines = documents.flatMap(doc => doc.outline);
    const totalSections = allOutlines.length;
    const completedSections = allOutlines.filter(item => item.page < currentPage).length;
    const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
    const estimatedRemaining = Math.max(0, Math.round((totalSections - completedSections) * 2.5));

    return {
      totalSections,
      completedSections,
      progressPercentage,
      estimatedRemaining
    };
  }, [documents, currentPage]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Enhanced Header */}
      <div className="p-5 border-b border-border-subtle flex-shrink-0 bg-surface-elevated/50">
        <h3 className="font-semibold text-lg text-text-primary mb-2">Document Outline</h3>
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <span className="text-brand-primary font-medium">Page {currentPage}</span>
            {readingStats.completedSections > 0 && (
              <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full">
                {readingStats.completedSections}/{readingStats.totalSections} read
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Document List and Outline */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {documents.length > 1 ? (
            // Multiple documents - show document tree
            documents.map(document => {
              const isDocExpanded = expandedDocuments.has(document.id);
              const isCurrentDoc = currentDocument?.id === document.id;
              
              return (
                <div key={document.id} className="border border-border-subtle rounded-lg">
                  {/* Document Header */}
                  <div
                    className={`flex items-center gap-2 p-3 cursor-pointer rounded-t-lg transition-all duration-200 ${
                      isCurrentDoc 
                        ? 'bg-brand-primary/10 border-brand-primary' 
                        : 'bg-surface-elevated hover:bg-surface-hover'
                    }`}
                    onClick={() => {
                      if (onDocumentChange) {
                        onDocumentChange(document);
                      }
                      toggleDocumentExpanded(document.id);
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDocumentExpanded(document.id);
                      }}
                    >
                      {isDocExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <FolderOpen className={`h-4 w-4 ${isCurrentDoc ? 'text-brand-primary' : 'text-text-secondary'}`} />
                    <span className={`text-sm font-medium truncate ${isCurrentDoc ? 'text-brand-primary' : 'text-text-primary'}`}>
                      {document.name}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      ({document.outline.length} sections)
                    </span>
                  </div>
                  
                  {/* Document Outline */}
                  {isDocExpanded && (
                    <div className="border-t border-border-subtle">
                      {document.outline.map(item => renderOutlineItem(item, document))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Single document - show outline directly
            currentDocument && (
              <div className="space-y-1">
                {processedOutline.map(item => renderOutlineItem(item, currentDocument))}
              </div>
            )
          )}
        </div>
      </ScrollArea>

      {/* Enhanced Progress Footer */}
      <div className="p-5 border-t border-border-subtle bg-surface-elevated/30 flex-shrink-0">
        <div className="text-sm text-text-secondary space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Reading Progress</span>
            <span className="font-semibold text-brand-primary">{readingStats.progressPercentage}%</span>
          </div>
          
          {/* Enhanced progress bar */}
          <div className="relative w-full bg-background-secondary rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-primary h-full rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${Math.min(readingStats.progressPercentage, 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
            </div>
          </div>
          
          {/* Reading statistics */}
          <div className="flex justify-between items-center text-xs text-text-tertiary">
            <span>Est. {readingStats.estimatedRemaining} min remaining</span>
            <span>{readingStats.completedSections} sections completed</span>
          </div>
          
          {/* Quick navigation hint */}
          <div className="text-center text-xs text-text-tertiary pt-2 border-t border-border-subtle">
            💡 Click any section for instant navigation
          </div>
        </div>
      </div>
    </div>
  );
}