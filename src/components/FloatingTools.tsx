import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Volume2, 
  Highlighter, 
  Sparkles,
  ChevronUp,
  ChevronDown,
  Brain,
  Headphones,
  Copy,
  Download
} from 'lucide-react';
import { PDFDocument, Highlight } from './PDFReader';

interface FloatingToolsProps {
  currentDocument: PDFDocument | null;
  currentPage: number;
  onHighlight: (highlight: Highlight) => void;
}

export function FloatingTools({ currentDocument, currentPage, onHighlight }: FloatingToolsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInsightsGeneration = async () => {
    if (!currentDocument) return;
    
    setIsGenerating(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock insight highlights
    const mockHighlights: Highlight[] = [
      {
        id: `highlight-${Date.now()}-1`,
        text: "Machine learning algorithms demonstrate 94% accuracy in diagnostic imaging",
        page: currentPage,
        color: 'primary',
        relevanceScore: 0.92,
        explanation: "Key finding relevant to AI performance in healthcare"
      },
      {
        id: `highlight-${Date.now()}-2`,
        text: "Current limitations include data privacy concerns and regulatory compliance",
        page: currentPage + 1,
        color: 'secondary',
        relevanceScore: 0.87,
        explanation: "Important limitation to consider for implementation"
      },
      {
        id: `highlight-${Date.now()}-3`,
        text: "Integration with existing EHR systems requires standardized protocols",
        page: currentPage + 2,
        color: 'tertiary',
        relevanceScore: 0.83,
        explanation: "Technical requirement for system integration"
      }
    ];

    mockHighlights.forEach(highlight => onHighlight(highlight));
    setIsGenerating(false);
  };

  const handlePodcastGeneration = async () => {
    if (!currentDocument) return;
    
    // Would integrate with text-to-speech API
    console.log('Generating podcast for current section...');
  };

  const tools = [
    {
      id: 'insights',
      label: 'Insights Bulb',
      icon: Lightbulb,
      description: 'Generate AI insights',
      action: handleInsightsGeneration,
      className: 'bg-brand-primary hover:bg-brand-primary/90 text-text-on-brand'
    },
    {
      id: 'podcast',
      label: 'Podcast Mode',
      icon: Headphones,
      description: 'Listen to summary',
      action: handlePodcastGeneration,
      className: 'bg-brand-secondary hover:bg-brand-secondary/90 text-text-on-brand'
    },
    {
      id: 'smart-highlight',
      label: 'Smart Highlight',
      icon: Brain,
      description: 'AI-powered highlighting',
      action: () => console.log('Smart highlighting...'),
      className: 'bg-brand-accent hover:bg-brand-accent/90 text-text-primary'
    }
  ];

  const quickActions = [
    {
      id: 'copy',
      icon: Copy,
      label: 'Copy selection',
      action: () => navigator.clipboard?.writeText('Selected text would be copied')
    },
    {
      id: 'download',
      icon: Download,
      label: 'Download highlights',
      action: () => console.log('Downloading highlights...')
    }
  ];

  if (!currentDocument) {
    return null;
  }

  return (
    <div className="absolute bottom-6 right-6 z-50">
      <div className={`
        floating-tool p-2 space-y-2 transition-all duration-300
        ${isExpanded ? 'w-64' : 'w-auto'}
      `}>
        {/* Expand/Collapse Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 text-text-secondary hover:text-text-primary"
          >
            <Sparkles className="h-4 w-4" />
            {isExpanded ? (
              <>
                <span className="text-sm">Smart Tools</span>
                <ChevronDown className="h-3 w-3" />
              </>
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
          
          {!isExpanded && (
            <Badge variant="secondary" className="text-xs">
              {tools.length}
            </Badge>
          )}
        </div>

        {/* Expanded Tools */}
        {isExpanded && (
          <div className="space-y-3 animate-fade-in">
            {/* Main Tools */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                AI Tools
              </p>
              
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Button
                    key={tool.id}
                    onClick={tool.action}
                    disabled={isGenerating}
                    className={`w-full justify-start gap-3 h-auto p-3 ${tool.className}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{tool.label}</div>
                      <div className="text-xs opacity-90">{tool.description}</div>
                    </div>
                    {isGenerating && tool.id === 'insights' && (
                      <div className="ml-auto">
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Quick Actions
              </p>
              
              <div className="flex gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      onClick={action.action}
                      className="flex-1 gap-2"
                      title={action.label}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="sr-only">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Page Info */}
            <div className="pt-2 border-t border-border-subtle">
              <div className="text-xs text-text-secondary space-y-1">
                <div className="flex justify-between">
                  <span>Current Page</span>
                  <span className="font-mono">{currentPage}</span>
                </div>
                <div className="flex justify-between">
                  <span>Document</span>
                  <span className="truncate max-w-32" title={currentDocument.name}>
                    {currentDocument.name.split('.')[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}