import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  ExternalLink, 
  Search,
  Sparkles,
  BookOpen,
  ChevronRight,
  Info
} from 'lucide-react';
import { apiService, RelatedSectionWithSnippet } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface RelatedSectionsPanelProps {
  selectedText: string;
  currentDocumentId: string;
  currentPage: number;
  allDocumentIds: string[];
  persona?: string;
  jobToBeDone?: string;
  onNavigateToSection?: (documentId: string, pageNumber: number) => void;
}

export function RelatedSectionsPanel({
  selectedText,
  currentDocumentId,
  currentPage,
  allDocumentIds,
  persona = 'researcher',
  jobToBeDone = 'understand concepts',
  onNavigateToSection
}: RelatedSectionsPanelProps) {
  const [relatedSections, setRelatedSections] = useState<RelatedSectionWithSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedText && selectedText.length > 10) {
      fetchRelatedSections();
    } else {
      setRelatedSections([]);
    }
  }, [selectedText, currentDocumentId, currentPage]);

  const fetchRelatedSections = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sections = await apiService.findRelatedByText(
        selectedText,
        currentDocumentId,
        currentPage,
        allDocumentIds,
        persona,
        jobToBeDone
      );
      
      setRelatedSections(sections);
      
      if (sections.length === 0) {
        toast({
          title: "No related sections found",
          description: "Try selecting different text or uploading more documents",
          variant: "default"
        });
      }
    } catch (err) {
      console.error('Error fetching related sections:', err);
      setError('Failed to find related sections');
      toast({
        title: "Error",
        description: "Failed to find related sections. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (section: RelatedSectionWithSnippet) => {
    if (onNavigateToSection) {
      onNavigateToSection(section.document_id, section.page_number);
      toast({
        title: "Navigating",
        description: `Opening ${section.document_name} at page ${section.page_number}`,
      });
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score > 0.8) return 'text-green-600 dark:text-green-400';
    if (score > 0.6) return 'text-blue-600 dark:text-blue-400';
    if (score > 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getRelevanceBadge = (score: number) => {
    if (score > 0.8) return { text: 'High', variant: 'default' as const };
    if (score > 0.6) return { text: 'Medium', variant: 'secondary' as const };
    if (score > 0.4) return { text: 'Low', variant: 'outline' as const };
    return { text: 'Weak', variant: 'outline' as const };
  };

  if (!selectedText) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Related Sections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Select text in the PDF to find related sections</p>
            <p className="text-xs mt-2">Sections from all your documents will be searched</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Related Sections
          </div>
          {relatedSections.length > 0 && (
            <Badge variant="secondary">{relatedSections.length} found</Badge>
          )}
        </CardTitle>
        <div className="mt-2">
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <span className="font-medium">Selected:</span> "{selectedText.substring(0, 50)}..."
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={fetchRelatedSections}
            >
              Try Again
            </Button>
          </div>
        ) : relatedSections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No related sections found</p>
            <p className="text-xs mt-2">Try selecting different text</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-3 pr-4">
              {relatedSections.map((section, index) => {
                const relevanceBadge = getRelevanceBadge(section.relevance_score);
                return (
                  <Card 
                    key={index}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
                    onClick={() => handleNavigate(section)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {section.document_name}
                            </span>
                            <Badge variant={relevanceBadge.variant} className="text-xs">
                              {relevanceBadge.text}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-sm line-clamp-2">
                            {section.section_title}
                          </h4>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                      
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground line-clamp-3">
                        {section.snippet}
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Page {section.page_number}
                          </span>
                          <span className={`text-xs ${getRelevanceColor(section.relevance_score)}`}>
                            {Math.round(section.relevance_score * 100)}% match
                          </span>
                        </div>
                        {section.explanation && (
                          <div className="flex items-center gap-1">
                            <Info className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {section.explanation}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}