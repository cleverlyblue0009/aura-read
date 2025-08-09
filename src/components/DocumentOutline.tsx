import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, FileText, Eye } from 'lucide-react';
import { OutlineItem } from './PDFReader';

interface DocumentOutlineProps {
  outline: OutlineItem[];
  currentPage: number;
  onItemClick: (item: OutlineItem) => void;
}

export function DocumentOutline({ outline, currentPage, onItemClick }: DocumentOutlineProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['root']));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderOutlineItem = (item: OutlineItem, depth = 0) => {
    const isActive = Math.abs(currentPage - item.page) <= 1; // Active if within 1 page
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isHovered = hoveredItem === item.id;

    return (
      <div key={item.id} className="select-none">
        <div
          className={`
            outline-item flex items-center gap-2 cursor-pointer group
            ${isActive ? 'active' : ''}
          `}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => onItemClick(item)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-surface-hover"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              <FileText className="h-3 w-3 text-text-tertiary" />
            </div>
          )}

          <span className={`
            flex-1 text-sm truncate
            ${item.level === 1 ? 'font-medium' : ''}
            ${item.level === 2 ? 'font-normal' : ''}
            ${item.level >= 3 ? 'text-text-secondary' : ''}
          `}>
            {item.title}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isHovered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-surface-hover"
                onClick={(e) => {
                  e.stopPropagation();
                  // Would show page preview
                }}
                aria-label="Preview page"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            
            <span className="text-xs text-text-tertiary font-mono">
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
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-5 border-b border-border-subtle">
        <h3 className="font-semibold text-lg text-text-primary mb-2">Document Outline</h3>
        <p className="text-sm text-text-secondary">
          {outline.length} sections • Currently on page {currentPage}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {outline.map(item => renderOutlineItem(item))}
        </div>
      </ScrollArea>

      <div className="p-5 border-t border-border-subtle bg-surface-elevated/30">
        <div className="text-sm text-text-secondary space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Reading Progress</span>
            <span className="font-semibold text-brand-primary">{Math.round((currentPage / 30) * 100)}%</span>
          </div>
          <div className="w-full bg-background-secondary rounded-full h-2">
            <div 
              className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((currentPage / 30) * 100, 100)}%` }}
            />
          </div>
          <div className="text-center text-text-tertiary">
            Est. {Math.max(1, Math.round((30 - currentPage) * 1.5))} min remaining
          </div>
        </div>
      </div>
    </div>
  );
}