import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Lightbulb, 
  Brain, 
  AlertTriangle, 
  Link2, 
  Sparkles,
  User,
  Target,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'key-insight' | 'fact' | 'contradiction' | 'inspiration';
  title: string;
  content: string;
  relevance: number;
  pageReference?: number;
  source?: string;
}

interface InsightsPanelProps {
  documentId?: string;
  persona?: string;
  jobToBeDone?: string;
}

export function InsightsPanel({ documentId, persona: initialPersona, jobToBeDone: initialJobToBeDone }: InsightsPanelProps) {
  const [persona, setPersona] = useState(initialPersona || '');
  const [jobToBeDone, setJobToBeDone] = useState(initialJobToBeDone || '');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock insights data
  const mockInsights: Insight[] = [
    {
      id: '1',
      type: 'key-insight',
      title: 'AI Accuracy Breakthrough',
      content: 'The study demonstrates that machine learning algorithms achieve 94% accuracy in diagnostic imaging, representing a significant improvement over traditional methods.',
      relevance: 0.95,
      pageReference: 1,
      source: 'Abstract'
    },
    {
      id: '2',
      type: 'fact',
      title: 'Diagnostic Time Reduction',
      content: 'AI implementation reduces diagnostic time by up to 60%, enabling faster patient care and improved healthcare efficiency.',
      relevance: 0.88,
      pageReference: 1
    },
    {
      id: '3',
      type: 'contradiction',
      title: 'Implementation Challenges',
      content: 'While AI shows great promise, the study identifies significant barriers including data privacy concerns and regulatory compliance requirements.',
      relevance: 0.82,
      pageReference: 2
    },
    {
      id: '4',
      type: 'inspiration',
      title: 'Cross-Domain Application',
      content: 'The methodologies described could be adapted for other domains like autonomous vehicles or financial fraud detection.',
      relevance: 0.75,
      pageReference: 10
    }
  ];

  const handleGenerateInsights = async () => {
    if (!documentId || (!persona && !jobToBeDone)) return;
    
    setIsGenerating(true);
    
    // Simulate API call to Gemini 2.5 Flash
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setInsights(mockInsights);
    setIsGenerating(false);
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'key-insight':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'fact':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'contradiction':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'inspiration':
        return <Link2 className="h-4 w-4 text-purple-500" />;
    }
  };

  const getInsightTypeLabel = (type: Insight['type']) => {
    switch (type) {
      case 'key-insight':
        return 'Key Insight';
      case 'fact':
        return 'Did You Know?';
      case 'contradiction':
        return 'Contradiction';
      case 'inspiration':
        return 'Inspiration';
    }
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.9) return 'bg-green-500';
    if (relevance >= 0.8) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-text-primary">AI Insights</h3>
        </div>
        <p className="text-xs text-text-secondary">
          Generate contextual insights based on your persona and goals
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Persona Input */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-text-secondary" />
              <label className="text-sm font-medium text-text-primary">
                Who are you?
              </label>
            </div>
            <Textarea
              placeholder="e.g., Medical researcher, Healthcare administrator, AI developer..."
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="text-sm"
              rows={2}
            />
          </section>

          {/* Job to be Done */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-text-secondary" />
              <label className="text-sm font-medium text-text-primary">
                What are you trying to achieve?
              </label>
            </div>
            <Textarea
              placeholder="e.g., Evaluate AI implementation feasibility, Understand current limitations, Research competitive landscape..."
              value={jobToBeDone}
              onChange={(e) => setJobToBeDone(e.target.value)}
              className="text-sm"
              rows={3}
            />
          </section>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateInsights}
            disabled={isGenerating || (!persona && !jobToBeDone)}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Insights...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" />
                Generate AI Insights
              </>
            )}
          </Button>

          {/* Generated Insights */}
          {insights.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-text-primary">
                  Generated Insights
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {insights.length} insights
                </Badge>
              </div>

              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3 bg-surface-elevated border border-border-subtle rounded-lg hover:border-border-moderate transition-colors cursor-pointer group"
                    onClick={() => {
                      if (insight.pageReference) {
                        // Would navigate to the referenced page
                        console.log(`Navigate to page ${insight.pageReference}`);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className="text-xs px-1.5 py-0.5"
                          >
                            {getInsightTypeLabel(insight.type)}
                          </Badge>
                          
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${getRelevanceColor(insight.relevance)}`}
                              title={`${Math.round(insight.relevance * 100)}% relevance`}
                            />
                            <span className="text-xs text-text-tertiary">
                              {Math.round(insight.relevance * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        <h5 className="text-sm font-medium text-text-primary mb-2 group-hover:text-brand-primary transition-colors">
                          {insight.title}
                        </h5>
                        
                        <p className="text-xs text-text-secondary leading-relaxed mb-2">
                          {insight.content}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          {insight.pageReference && (
                            <div className="flex items-center gap-1 text-xs text-text-tertiary">
                              <ExternalLink className="h-3 w-3" />
                              Page {insight.pageReference}
                              {insight.source && ` • ${insight.source}`}
                            </div>
                          )}
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={handleGenerateInsights}
                disabled={isGenerating}
                className="w-full gap-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate Insights
              </Button>
            </section>
          )}

          {/* Placeholder when no insights */}
          {insights.length === 0 && !isGenerating && (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-text-secondary mb-1">
                No insights generated yet
              </p>
              <p className="text-xs text-text-tertiary">
                Fill in your persona and goals to get started
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}