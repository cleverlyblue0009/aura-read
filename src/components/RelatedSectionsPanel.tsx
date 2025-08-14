import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  ExternalLink, 
  ChevronRight, 
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Loader2
} from 'lucide-react';
import { RelatedSectionSnippet } from '@/lib/api';

interface RelatedSectionsPanelProps {
  selectedText: string;
  relatedSections: RelatedSectionSnippet[];
  isLoading: boolean;
  onNavigateToSection: (docId: string, page: number) => void;
  onGenerateInsights: () => void;
  onGeneratePodcast: () => void;
  className?: string;
}

const getSectionTypeIcon = (type: string) => {
  switch (type) {
    case 'contradiction':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'supporting':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'example':
      return <BookOpen className="h-4 w-4 text-blue-500" />;
    case 'extension':
      return <ArrowRight className="h-4 w-4 text-purple-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

const getSectionTypeLabel = (type: string) => {
  switch (type) {
    case 'contradiction':
      return 'Contradicts';
    case 'supporting':
      return 'Supports';
    case 'example':
      return 'Example';
    case 'extension':
      return 'Extends';
    default:
      return 'Related';
  }
};

const getSectionTypeBadgeVariant = (type: string) => {
  switch (type) {
    case 'contradiction':
      return 'destructive';
    case 'supporting':
      return 'default';
    case 'example':
      return 'secondary';
    case 'extension':
      return 'outline';
    default:
      return 'secondary';
  }
};

export function RelatedSectionsPanel({
  selectedText,
  relatedSections,
  isLoading,
  onNavigateToSection,
  onGenerateInsights,
  onGeneratePodcast,
  className = ''
}: RelatedSectionsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!selectedText) {
    return (
      <Card className={`${className} border-dashed`}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">Select Text to Explore</CardTitle>
          <CardDescription className="max-w-sm">
            Select any text in the PDF to find related sections, insights, and connections across your documents.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Related Sections
            </CardTitle>
            <CardDescription className="mt-1">
              <span className="font-medium">Selected:</span> "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
            </CardDescription>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            onClick={onGenerateInsights}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Generate Insights
          </Button>
          <Button
            onClick={onGeneratePodcast}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Create Podcast
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Finding related sections...</span>
          </div>
        ) : relatedSections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No related sections found.</p>
            <p className="text-xs mt-1">Try selecting a longer or more specific text.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {relatedSections.map((section, index) => (
                <Card key={`${section.doc_id}-${section.page}-${index}`} className="border-l-4 border-l-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getSectionTypeIcon(section.section_type)}
                          <Badge variant={getSectionTypeBadgeVariant(section.section_type)} className="text-xs">
                            {getSectionTypeLabel(section.section_type)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(section.relevance_score * 100)}% match
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-medium leading-tight">
                          {section.heading || 'Untitled Section'}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          From: {section.doc_name} • Page {section.page}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateToSection(section.doc_id, section.page)}
                        className="ml-2 flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {section.snippet}
                    </div>
                    
                    {section.start_page !== section.end_page && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Spans pages {section.start_page}-{section.end_page}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}