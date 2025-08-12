import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, FileText, Eye, ArrowRight, Clock } from 'lucide-react';
import { OutlineItem } from './PDFReader';

interface DocumentOutlineProps {
  outline: OutlineItem[];
  currentPage: number;
  onItemClick: (item: OutlineItem) => void;
}

export function DocumentOutline({ outline, currentPage, onItemClick }: DocumentOutlineProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['root']));
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

  // Enhanced item click with smooth navigation
  const handleItemClick = useCallback((item: OutlineItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
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
  }, [onItemClick]);

  // Memoized outline processing for performance
  const processedOutline = useMemo(() => {
    return outline.map(item => ({
      ...item,
      isActive: Math.abs(currentPage - item.page) <= 1,
      hasChildren: item.children && item.children.length > 0,
      isExpanded: expandedItems.has(item.id),
      distanceFromCurrent: Math.abs(currentPage - item.page)
    }));
  }, [outline, currentPage, expandedItems]);

  const renderOutlineItem = useCallback((item: OutlineItem, depth = 0) => {
    const isActive = Math.abs(currentPage - item.page) <= 1;
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
      <div key={item.id} className="select-none">
        <div
          className={getItemStyles()}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={(e) => handleItemClick(item, e)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          role="button"
          tabIndex={0}
          aria-label={`Navigate to ${item.title} on page ${item.page}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleItemClick(item, e as any);
            }
          }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-surface-hover flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 transition-transform" />
              ) : (
                <ChevronRight className="h-3 w-3 transition-transform" />
              )}
            </Button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <FileText className="h-3 w-3 text-text-tertiary" />
            </div>
          )}

          <span className={`
            flex-1 text-sm truncate transition-colors
            ${item.level === 1 ? 'font-semibold text-text-primary' : ''}
            ${item.level === 2 ? 'font-medium text-text-primary' : ''}
            ${item.level >= 3 ? 'text-text-secondary' : ''}
            ${isActive ? 'text-brand-primary' : ''}
          `}>
            {item.title}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {/* Distance indicator for nearby pages */}
            {distanceFromCurrent <= 5 && distanceFromCurrent > 1 && (
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <Clock className="h-3 w-3" />
                <span>{distanceFromCurrent}p</span>
              </div>
            )}
            
            {/* Quick navigation button */}
            {isHovered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-brand-primary/10 hover:text-brand-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(item, e);
                }}
                aria-label="Quick navigate"
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
            
            {/* Page preview button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-surface-hover opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                // Future: implement page preview
                console.log('Preview page:', item.page);
              }}
              aria-label="Preview page"
            >
              <Eye className="h-3 w-3" />
            </Button>
            
            <span className="text-xs text-text-tertiary font-mono min-w-[2rem] text-right">
              {item.page}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="animate-fade-in">
            {item.children!.map(child => renderOutlineItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [currentPage, expandedItems, hoveredItem, handleItemClick, toggleExpanded]);

  // Calculate reading statistics
  const readingStats = useMemo(() => {
    const totalSections = outline.length;
    const completedSections = outline.filter(item => item.page < currentPage).length;
    const progressPercentage = Math.round((currentPage / 30) * 100); // Assuming 30 pages total
    const estimatedRemaining = Math.max(1, Math.round((30 - currentPage) * 1.5));
    
    return {
      totalSections,
      completedSections,
      progressPercentage,
      estimatedRemaining
    };
  }, [outline, currentPage]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Enhanced Header */}
      <div className="p-5 border-b border-border-subtle flex-shrink-0 bg-surface-elevated/50">
        <h3 className="font-semibold text-lg text-text-primary mb-2">Document Outline</h3>
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>{outline.length} sections</span>
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

      {/* Scrollable Outline with enhanced performance */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {processedOutline.map(item => renderOutlineItem(item))}
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