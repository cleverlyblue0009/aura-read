import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { apiService, Insight as ApiInsight } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
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
  type: 'takeaway' | 'fact' | 'contradiction' | 'connection' | 'info' | 'error';
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
  currentText?: string;
  onPageNavigate?: (page: number) => void;
}

export function InsightsPanel({ documentId, persona: propPersona, jobToBeDone: propJobToBeDone, currentText, onPageNavigate }: InsightsPanelProps) {
  const [persona, setPersona] = useState(propPersona || '');
  const [jobToBeDone, setJobToBeDone] = useState(propJobToBeDone || '');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Update persona and job when props change
  useEffect(() => {
    if (propPersona) setPersona(propPersona);
    if (propJobToBeDone) setJobToBeDone(propJobToBeDone);
  }, [propPersona, propJobToBeDone]);

  // Auto-generate insights when content is available and user context is set
  useEffect(() => {
    if (currentText && currentText.length > 100 && persona && jobToBeDone && insights.length === 0) {
      // Add a small delay to avoid too many API calls
      const timer = setTimeout(() => {
        handleGenerateInsights();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentText, persona, jobToBeDone]);

  const handleGenerateInsights = async () => {
    if (!currentText || !persona || !jobToBeDone) {
      toast({
        title: "Missing information",
        description: "Please ensure there's content to analyze and persona/job are set.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const apiInsights = await apiService.generateInsights(
        currentText,
        persona,
        jobToBeDone,
        documentId
      );
      
      // Convert API insights to component format
      const convertedInsights: Insight[] = apiInsights.map((insight, index) => ({
        id: `insight-${Date.now()}-${index}`,
        type: insight.type,
        title: getInsightTitle(insight.type),
        content: insight.content,
        relevance: 0.8 + (Math.random() * 0.2), // Randomize relevance between 0.8-1.0
        pageReference: Math.floor(Math.random() * 5) + 1, // Random page reference for navigation
        source: 'AI Analysis'
      }));
      
      setInsights(convertedInsights);
      
      toast({
        title: "Insights generated",
        description: `Generated ${convertedInsights.length} insights for the current content.`
      });
      
    } catch (error) {
      console.error('Failed to generate insights:', error);
      toast({
        title: "Failed to generate insights",
        description: "Unable to analyze content. Please check your connection and try again.",
        variant: "destructive"
      });
      // Don't fallback to mock data - leave insights empty
      setInsights([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const getInsightTitle = (type: string): string => {
    switch (type) {
      case 'takeaway': return 'Key Takeaway';
      case 'fact': return 'Did You Know?';
      case 'contradiction': return 'Counterpoint';
      case 'connection': return 'Connection';
      case 'info': return 'Information';
      case 'error': return 'Error';
      default: return 'Insight';
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'takeaway':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'fact':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'contradiction':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'connection':
        return <Link2 className="h-4 w-4 text-purple-500" />;
      case 'info':
        return <Sparkles className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
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
                        onPageNavigate?.(insight.pageReference);
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