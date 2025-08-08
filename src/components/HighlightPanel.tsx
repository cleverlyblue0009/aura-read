import { useState } from 'react';
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
  MoreVertical
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
}

export function HighlightPanel({ highlights, onHighlightClick }: HighlightPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState<'all' | 'primary' | 'secondary' | 'tertiary'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'page' | 'recent'>('relevance');

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

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search highlights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Sort */}
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

      {/* Highlights List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredHighlights.length > 0 ? (
            filteredHighlights.map((highlight) => (
              <div
                key={highlight.id}
                className={`
                  p-3 rounded-lg border-l-4 cursor-pointer transition-all
                  ${getColorClasses(highlight.color)}
                  hover:shadow-md hover:scale-[1.01]
                `}
                onClick={() => onHighlightClick(highlight)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Page {highlight.page}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          highlight.relevanceScore >= 0.9 ? 'bg-green-500' :
                          highlight.relevanceScore >= 0.8 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}
                      />
                      <span className="text-xs text-text-tertiary">
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
                          onHighlightClick(highlight);
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

                <p className="text-sm text-text-primary mb-2 leading-relaxed">
                  "{highlight.text}"
                </p>

                <p className="text-xs text-text-secondary">
                  {highlight.explanation}
                </p>
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

      {/* Summary Stats */}
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
          </div>
        </div>
      )}
    </div>
  );
}