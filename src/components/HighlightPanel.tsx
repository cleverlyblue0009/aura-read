import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Highlighter, 
  Search, 
  Filter, 
  Copy, 
  Download,
  ExternalLink,
  Trash2,
  SortAsc,
  MoreVertical,
  BookOpen,
  Target,
  Star
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Highlight } from './PDFReader';

interface HighlightPanelProps {
  highlights: Highlight[];
  onHighlightClick: (highlight: Highlight) => void;
  onNavigateToPage?: (page: number) => void;
  currentPage?: number;
}

export function HighlightPanel({ 
  highlights, 
  onHighlightClick, 
  onNavigateToPage,
  currentPage = 1 
}: HighlightPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState<'all' | 'primary' | 'secondary' | 'tertiary'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'page' | 'recent'>('relevance');
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);

  const filteredHighlights = highlights
    .filter(highlight => {
      const matchesSearch = highlight.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           highlight.explanation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesColor = filterColor === 'all' || highlight.color === filterColor;
      return matchesSearch && matchesColor;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'page':
          return a.page - b.page;
        case 'recent':
          return parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]);
        default:
          return 0;
      }
    });

  const getColorName = (color: Highlight['color']) => {
    switch (color) {
      case 'primary': return 'Yellow';
      case 'secondary': return 'Green';
      case 'tertiary': return 'Blue';
    }
  };

  const getColorClasses = (color: Highlight['color']) => {
    switch (color) {
      case 'primary': return 'bg-highlight-primary border-yellow-400';
      case 'secondary': return 'bg-highlight-secondary border-green-400';
      case 'tertiary': return 'bg-highlight-tertiary border-blue-400';
    }
  };

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    setSelectedHighlight(highlight.id);
    
    // Navigate to the page if different from current
    if (onNavigateToPage && highlight.page !== currentPage) {
      onNavigateToPage(highlight.page);
    }
    
    // Call the original click handler
    onHighlightClick(highlight);
    
    // Clear selection after a brief delay
    setTimeout(() => setSelectedHighlight(null), 2000);
  }, [onHighlightClick, onNavigateToPage, currentPage]);

  const handleExportHighlights = () => {
    const exportData = filteredHighlights.map(h => ({
      text: h.text,
      page: h.page,
      relevance: h.relevanceScore,
      explanation: h.explanation,
      color: getColorName(h.color)
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'highlights.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    const text = filteredHighlights
      .map(h => `"${h.text}" (Page ${h.page}) - ${h.explanation}`)
      .join('\n\n');
    
    try {
      await navigator.clipboard.writeText(text);
      // Would show success toast
    } catch (err) {
      console.error('Failed to copy highlights:', err);
    }
  };

  const getRelevanceIcon = (score: number) => {
    if (score >= 0.9) return <Star className="h-3 w-3 text-green-500" />;
    if (score >= 0.8) return <Target className="h-3 w-3 text-yellow-500" />;
    return <BookOpen className="h-3 w-3 text-orange-500" />;
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.8) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <Highlighter className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-text-primary">Highlights</h3>
          <Badge variant="secondary" className="text-xs">
            {highlights.length}
          </Badge>
        </div>

        {/* Enhanced Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search highlights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Enhanced Filters and Sort */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                {filterColor === 'all' ? 'All Colors' : getColorName(filterColor)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterColor('all')}>
                All Colors
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterColor('primary')}>
                <div className="w-3 h-3 bg-highlight-primary rounded mr-2" />
                Yellow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterColor('secondary')}>
                <div className="w-3 h-3 bg-highlight-secondary rounded mr-2" />
                Green
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterColor('tertiary')}>
                <div className="w-3 h-3 bg-highlight-tertiary rounded mr-2" />
                Blue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SortAsc className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('relevance')}>
                By Relevance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('page')}>
                By Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                Most Recent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Action Buttons */}
        {highlights.length > 0 && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="flex-1 gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHighlights}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Highlights List with Better Navigation */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {filteredHighlights.length > 0 ? (
            filteredHighlights.map((highlight) => (
              <div
                key={highlight.id}
                className={`
                  p-4 rounded-xl border-l-4 cursor-pointer transition-all duration-200
                  ${getColorClasses(highlight.color)} backdrop-blur-sm
                  hover:shadow-lg hover:scale-[1.02] hover:border-l-8
                  group relative overflow-hidden
                  ${selectedHighlight === highlight.id ? 'ring-2 ring-brand-primary ring-opacity-50' : ''}
                  ${highlight.page === currentPage ? 'ring-1 ring-brand-primary/30' : ''}
                `}
                onClick={() => handleHighlightClick(highlight)}
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={highlight.page === currentPage ? "default" : "outline"} 
                        className={`text-xs ${highlight.page === currentPage ? 'bg-brand-primary text-white' : 'bg-white/80 backdrop-blur-sm'}`}
                      >
                        Page {highlight.page}
                        {highlight.page === currentPage && <span className="ml-1">• Current</span>}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getRelevanceIcon(highlight.relevanceScore)}
                        <span className={`text-xs font-medium ${getRelevanceColor(highlight.relevanceScore)}`}>
                          {Math.round(highlight.relevanceScore * 100)}%
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(highlight.text);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Text
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHighlightClick(highlight);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Go to Page
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // Would remove highlight
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-text-primary leading-relaxed font-medium mb-2 line-clamp-3">
                      "{highlight.text}"
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="w-1 h-4 bg-current opacity-30 rounded-full flex-shrink-0 mt-1"></div>
                    <p className="text-xs text-text-secondary leading-relaxed italic">
                      {highlight.explanation}
                    </p>
                  </div>

                  {/* Quick Navigation Button */}
                  {highlight.page !== currentPage && (
                    <div className="mt-3 pt-2 border-t border-white/20">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs gap-2 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToPage) {
                            onNavigateToPage(highlight.page);
                          }
                        }}
                      >
                        <BookOpen className="h-3 w-3" />
                        Jump to Page {highlight.page}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              {highlights.length === 0 ? (
                <>
                  <Highlighter className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-text-secondary mb-1">
                    No highlights yet
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Select text in the PDF to create highlights
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-text-secondary mb-1">
                    No highlights match your search
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Try adjusting your search terms or filters
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterColor('all');
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Enhanced Summary Stats */}
      {highlights.length > 0 && (
        <div className="p-4 border-t border-border-subtle">
          <div className="text-xs text-text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Total Highlights</span>
              <span>{highlights.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg. Relevance</span>
              <span>
                {Math.round(
                  highlights.reduce((acc, h) => acc + h.relevanceScore, 0) / highlights.length * 100
                )}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pages Covered</span>
              <span>
                {new Set(highlights.map(h => h.page)).size}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Current Page</span>
              <span>
                {highlights.filter(h => h.page === currentPage).length} highlights
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}