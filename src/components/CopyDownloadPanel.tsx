import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Copy, 
  Download, 
  FileText, 
  FileJson,
  FileSpreadsheet,
  Clipboard,
  Check
} from 'lucide-react';

interface CopyDownloadPanelProps {
  selectedText?: string;
  currentSection?: string;
  documentTitle?: string;
  insights?: Array<{ type: string; content: string }>;
  relatedSections?: Array<{ section_title: string; explanation: string }>;
}

export function CopyDownloadPanel({ 
  selectedText, 
  currentSection, 
  documentTitle,
  insights = [],
  relatedSections = []
}: CopyDownloadPanelProps) {
  const [exportFormat, setExportFormat] = useState<'txt' | 'json' | 'csv'>('txt');
  const [copied, setCopied] = useState<string>('');
  const { toast } = useToast();

  const exportFormats = [
    { value: 'txt', label: 'Plain Text', icon: FileText, description: 'Simple text format' },
    { value: 'json', label: 'JSON', icon: FileJson, description: 'Structured data format' },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Spreadsheet format' }
  ];

  const handleCopy = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
      
      toast({
        title: "Copied to clipboard",
        description: `${type} has been copied to your clipboard.`
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const generateExportContent = () => {
    const data = {
      document: documentTitle || 'Unknown Document',
      timestamp: new Date().toISOString(),
      selected_text: selectedText || '',
      current_section: currentSection || '',
      insights: insights,
      related_sections: relatedSections
    };

    switch (exportFormat) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        let csv = 'Type,Content\n';
        if (selectedText) csv += `"Selected Text","${selectedText.replace(/"/g, '""')}"\n`;
        if (currentSection) csv += `"Current Section","${currentSection.replace(/"/g, '""')}"\n`;
        insights.forEach(insight => {
          csv += `"Insight (${insight.type})","${insight.content.replace(/"/g, '""')}"\n`;
        });
        relatedSections.forEach(section => {
          csv += `"Related Section","${section.section_title.replace(/"/g, '""')} - ${section.explanation.replace(/"/g, '""')}"\n`;
        });
        return csv;
      
      case 'txt':
      default:
        let txt = `Document: ${data.document}\n`;
        txt += `Exported: ${new Date().toLocaleString()}\n\n`;
        if (selectedText) txt += `Selected Text:\n${selectedText}\n\n`;
        if (currentSection) txt += `Current Section: ${currentSection}\n\n`;
        if (insights.length > 0) {
          txt += 'Insights:\n';
          insights.forEach(insight => {
            txt += `- ${insight.type}: ${insight.content}\n`;
          });
          txt += '\n';
        }
        if (relatedSections.length > 0) {
          txt += 'Related Sections:\n';
          relatedSections.forEach(section => {
            txt += `- ${section.section_title}: ${section.explanation}\n`;
          });
        }
        return txt;
    }
  };

  const handleDownload = () => {
    const content = generateExportContent();
    const blob = new Blob([content], { 
      type: exportFormat === 'json' ? 'application/json' : 
           exportFormat === 'csv' ? 'text/csv' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docusense-export-${Date.now()}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `Export file has been downloaded as ${exportFormat.toUpperCase()}.`
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <Clipboard className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-text-primary">Copy & Export</h3>
        </div>
        <p className="text-xs text-text-secondary">
          Copy or download content and insights
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Copy Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-primary">Quick Copy</h4>
            
            {selectedText && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(selectedText, 'Selected text')}
                className="w-full justify-start gap-2"
              >
                {copied === 'Selected text' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy Selected Text
              </Button>
            )}

            {currentSection && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(currentSection, 'Current section')}
                className="w-full justify-start gap-2"
              >
                {copied === 'Current section' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy Current Section
              </Button>
            )}

            {insights.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(
                  insights.map(i => `${i.type}: ${i.content}`).join('\n\n'),
                  'Insights'
                )}
                className="w-full justify-start gap-2"
              >
                {copied === 'Insights' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy All Insights
              </Button>
            )}
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Export Options</h4>
            
            <div>
              <label className="text-sm text-text-secondary mb-2 block">Export Format</label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportFormats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <SelectItem key={format.value} value={format.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <div>{format.label}</div>
                            <div className="text-xs text-text-secondary">{format.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleDownload}
              className="w-full gap-2"
              disabled={!selectedText && !currentSection && insights.length === 0}
            >
              <Download className="h-4 w-4" />
              Download Export
            </Button>
          </div>

          {/* Export Preview */}
          <Card className="bg-surface-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Export Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-32">
                <pre className="text-xs text-text-secondary whitespace-pre-wrap">
                  {generateExportContent().substring(0, 300)}
                  {generateExportContent().length > 300 && '...'}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Usage Tips */}
          <Card className="bg-surface-subtle">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">Export Tips</h4>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>• Select text in the PDF to include in exports</li>
                <li>• JSON format preserves all metadata and structure</li>
                <li>• CSV format works well with spreadsheet applications</li>
                <li>• Text format is ideal for notes and documentation</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}