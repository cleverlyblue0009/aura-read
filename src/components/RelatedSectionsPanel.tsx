import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, Link2, Loader2 } from 'lucide-react';
import { RelatedSection } from '@/lib/api';

interface RelatedSectionsPanelProps {
  sections: RelatedSection[];
  onSectionClick?: (pageNumber: number) => void;
  isLoading?: boolean;
}

export function RelatedSectionsPanel({ sections, onSectionClick, isLoading }: RelatedSectionsPanelProps) {
  return (
    <div className="flex flex-col h-56">
      <div className="p-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-brand-primary" />
          <h4 className="text-sm font-medium text-text-primary">Related Sections</h4>
        </div>
        <Badge variant="secondary" className="text-xs">{sections.length}</Badge>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-secondary gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding sections...
          </div>
        ) : sections.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-tertiary px-4 text-center">
            No related sections yet. Navigate the document or select text to see suggestions.
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {sections.map((s, idx) => (
                <div
                  key={`${s.document}-${s.page_number}-${idx}`}
                  className="p-3 rounded-lg bg-surface-elevated border border-border-subtle hover:border-brand-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Page {s.page_number}</Badge>
                      <div className="text-[10px] text-text-tertiary">{Math.round(s.relevance_score * 100)}%</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onSectionClick?.(s.page_number)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Go
                    </Button>
                  </div>
                  <div className="text-sm font-medium text-text-primary line-clamp-2">{s.section_title}</div>
                  {s.explanation && (
                    <div className="text-xs text-text-secondary mt-1 line-clamp-2">{s.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}