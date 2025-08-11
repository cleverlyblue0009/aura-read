import { useState, useEffect } from 'react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';
import { BookOpen, Loader2, ExternalLink } from 'lucide-react';

interface TermDefinitionTooltipProps {
  term: string;
  context: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export function TermDefinitionTooltip({ 
  term, 
  context, 
  children, 
  enabled = true 
}: TermDefinitionTooltipProps) {
  const [definition, setDefinition] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && enabled && term && !definition && !isLoading) {
      loadDefinition();
    }
  }, [isOpen, enabled, term, definition, isLoading]);

  const loadDefinition = async () => {
    if (!term || !context) return;

    setIsLoading(true);
    setError('');
    
    try {
      const def = await apiService.defineTerm(term, context);
      setDefinition(def);
    } catch (err) {
      console.error('Failed to load definition:', err);
      setError('Unable to load definition');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExternalSearch = () => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(term)}`;
    window.open(searchUrl, '_blank');
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-brand-primary/50 hover:decoration-brand-primary transition-colors">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-80 p-0 bg-surface-elevated border border-border-subtle shadow-lg"
        >
          <div className="p-3 space-y-3">
            {/* Term Header */}
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-primary" />
              <span className="font-semibold text-text-primary">{term}</span>
            </div>

            {/* Definition Content */}
            <div className="space-y-2">
              {isLoading && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading definition...</span>
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive">
                  {error}
                </div>
              )}

              {definition && (
                <div className="text-sm text-text-primary leading-relaxed">
                  {definition}
                </div>
              )}

              {!isLoading && !definition && !error && (
                <div className="text-sm text-text-secondary">
                  Click to load definition...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
              <Badge variant="secondary" className="text-xs">
                AI Definition
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExternalSearch}
                className="h-6 px-2 text-xs gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Search
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook to automatically detect and wrap complex terms
export function useTermDefinitions(text: string, context: string, enabled: boolean = true) {
  const [processedText, setProcessedText] = useState<React.ReactNode>(text);

  useEffect(() => {
    if (!enabled || !text) {
      setProcessedText(text);
      return;
    }

    // Simple heuristic to identify complex terms
    const complexTermPattern = /\b[A-Z][a-z]*(?:[A-Z][a-z]*)+\b|\b\w{8,}\b/g;
    const matches = text.match(complexTermPattern) || [];
    
    if (matches.length === 0) {
      setProcessedText(text);
      return;
    }

    // Process text and wrap complex terms
    let processedContent: React.ReactNode[] = [];
    let lastIndex = 0;
    
    matches.forEach((match, index) => {
      const matchIndex = text.indexOf(match, lastIndex);
      
      // Add text before the match
      if (matchIndex > lastIndex) {
        processedContent.push(text.substring(lastIndex, matchIndex));
      }
      
      // Add the wrapped term
      processedContent.push(
        <TermDefinitionTooltip
          key={`term-${index}`}
          term={match}
          context={context}
          enabled={enabled}
        >
          {match}
        </TermDefinitionTooltip>
      );
      
      lastIndex = matchIndex + match.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      processedContent.push(text.substring(lastIndex));
    }
    
    setProcessedText(processedContent);
  }, [text, context, enabled]);

  return processedText;
}