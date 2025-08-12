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
          className="max-w-96 p-0 bg-surface-elevated border border-border-subtle shadow-xl rounded-lg overflow-hidden"
        >
          <div className="relative">
            {/* Header with gradient background */}
            <div className="bg-gradient-primary p-3 text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="font-semibold">{term}</span>
              </div>
            </div>

            {/* Definition Content */}
            <div className="p-4 space-y-3">
              {isLoading && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                  <span className="text-sm">Loading definition...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-700">
                    {error}
                  </div>
                </div>
              )}

              {definition && (
                <div className="space-y-2">
                  <div className="text-sm text-text-primary leading-relaxed">
                    {definition}
                  </div>
                  {/* Context indicator */}
                  <div className="text-xs text-text-tertiary italic">
                    Definition based on context: "{context.slice(0, 50)}..."
                  </div>
                </div>
              )}

              {!isLoading && !definition && !error && (
                <div className="text-center py-2">
                  <div className="text-sm text-text-secondary mb-2">
                    Hover to load definition
                  </div>
                  <div className="text-xs text-text-tertiary">
                    AI-powered contextual definitions
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <Badge variant="secondary" className="text-xs bg-brand-accent/20 text-brand-primary border-brand-primary/20">
                  AI Definition
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExternalSearch}
                    className="h-7 px-2 text-xs gap-1 hover:bg-brand-primary/10"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Enhanced hook to automatically detect and wrap complex terms
export function useTermDefinitions(text: string, context: string, enabled: boolean = true) {
  const [processedText, setProcessedText] = useState<React.ReactNode>(text);

  useEffect(() => {
    if (!enabled || !text) {
      setProcessedText(text);
      return;
    }

    // Enhanced patterns to identify complex terms
    const patterns = [
      // Technical terms (camelCase, PascalCase)
      /\b[A-Z][a-z]*(?:[A-Z][a-z]*)+\b/g,
      // Long technical words (8+ characters)
      /\b\w{8,}\b/g,
      // Acronyms (2-5 uppercase letters)
      /\b[A-Z]{2,5}\b/g,
      // Terms with special characters or numbers
      /\b\w*[-_]\w*\b/g,
      /\b\w*\d+\w*\b/g,
      // Scientific terms ending in common suffixes
      /\b\w+(?:tion|sion|ment|ness|ity|ism|ology|graphy)\b/g,
      // Medical/scientific prefixes
      /\b(?:bio|micro|macro|multi|inter|intra|trans|pre|post|anti|pro)\w+\b/g
    ];

    const allMatches = new Set<string>();
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        // Filter out common words and very short terms
        if (match.length >= 4 && !isCommonWord(match.toLowerCase())) {
          allMatches.add(match);
        }
      });
    });

    if (allMatches.size === 0) {
      setProcessedText(text);
      return;
    }

    // Sort matches by length (longest first) to avoid nested replacements
    const sortedMatches = Array.from(allMatches).sort((a, b) => b.length - a.length);
    
    // Process text and wrap complex terms
    let processedContent = text;
    const replacements: Array<{original: string, replacement: React.ReactNode}> = [];
    
    sortedMatches.forEach((match, index) => {
      const placeholder = `__TERM_${index}__`;
      const regex = new RegExp(`\\b${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      
      if (regex.test(processedContent)) {
        processedContent = processedContent.replace(regex, placeholder);
        replacements.push({
          original: placeholder,
          replacement: (
            <TermDefinitionTooltip
              key={`term-${index}`}
              term={match}
              context={context}
              enabled={enabled}
            >
              {match}
            </TermDefinitionTooltip>
          )
        });
      }
    });

    // Convert to React nodes
    const parts = processedContent.split(/(__TERM_\d+__)/);
    const finalContent = parts.map((part, index) => {
      const replacement = replacements.find(r => r.original === part);
      return replacement ? replacement.replacement : part;
    });
    
    setProcessedText(finalContent);
  }, [text, context, enabled]);

  return processedText;
}

// Helper function to filter out common words
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'that', 'this', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want',
    'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just',
    'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well',
    'were', 'what', 'your', 'work', 'life', 'only', 'government', 'company', 'system',
    'program', 'question', 'right', 'small', 'business', 'place', 'case', 'part',
    'group', 'problem', 'fact', 'hand', 'high', 'large', 'number', 'point', 'public',
    'same', 'school', 'state', 'way', 'week', 'woman', 'world', 'year', 'important',
    'information', 'service', 'different', 'following', 'without', 'including',
    'according', 'between', 'during', 'through', 'within', 'example', 'however',
    'because', 'before', 'after', 'while', 'where', 'whether', 'although', 'until'
  ]);
  
  return commonWords.has(word) || word.length < 4;
}