import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  BookOpen, 
  GraduationCap, 
  Loader2,
  Copy,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Type
} from 'lucide-react';

interface TextSimplifierProps {
  originalText?: string;
  onSimplifiedText?: (text: string) => void;
}

export function TextSimplifier({ originalText, onSimplifiedText }: TextSimplifierProps) {
  const [difficultyLevel, setDifficultyLevel] = useState<string>('simple');
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [customText, setCustomText] = useState<string>('');
  const [useCustomText, setUseCustomText] = useState(false);
  const { toast } = useToast();

  // Reset simplified text when original text changes
  useEffect(() => {
    setSimplifiedText('');
    setUseCustomText(false);
    setCustomText('');
  }, [originalText]);

  const difficultyLevels = [
    { 
      value: 'simple', 
      label: 'Simple', 
      icon: Zap,
      description: 'Very simple words and short sentences',
      color: 'bg-green-100 text-green-800'
    },
    { 
      value: 'moderate', 
      label: 'Moderate', 
      icon: BookOpen,
      description: 'Clear language with some technical terms',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      value: 'advanced', 
      label: 'Advanced', 
      icon: GraduationCap,
      description: 'Technical terms with clearer structure',
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  const currentLevel = difficultyLevels.find(level => level.value === difficultyLevel);

  // Get the text to simplify
  const getTextToSimplify = () => {
    if (useCustomText && customText.trim()) {
      return customText.trim();
    }
    return originalText?.trim() || '';
  };

  const handleSimplify = async () => {
    const textToSimplify = getTextToSimplify();
    
    if (!textToSimplify) {
      toast({
        title: "No text to simplify",
        description: "Please select text in the PDF or enter custom text to simplify.",
        variant: "destructive"
      });
      return;
    }

    setIsSimplifying(true);
    try {
      const simplified = await apiService.simplifyText(textToSimplify, difficultyLevel);
      setSimplifiedText(simplified);
      
      if (onSimplifiedText) {
        onSimplifiedText(simplified);
      }
      
      toast({
        title: "Text simplified",
        description: `Successfully simplified ${textToSimplify.split(' ').length} words to ${difficultyLevel} level.`
      });
      
    } catch (error) {
      console.error('Failed to simplify text:', error);
      
      // Fallback: Create a simple transformation
      const fallbackSimplified = createFallbackSimplification(textToSimplify, difficultyLevel);
      setSimplifiedText(fallbackSimplified);
      
      toast({
        title: "Text simplified (Local Processing)",
        description: `Simplified using local processing. Results may vary from AI service.`
      });
    } finally {
      setIsSimplifying(false);
    }
  };

  // Create a basic fallback simplification
  const createFallbackSimplification = (text: string, level: string): string => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    
    if (level === 'simple') {
      // Very basic simplification
      return sentences
        .map(sentence => {
          const words = sentence.trim().split(' ');
          if (words.length > 15) {
            return words.slice(0, 15).join(' ') + '...';
          }
          return sentence.trim();
        })
        .filter(Boolean)
        .join('. ') + '.';
    } else if (level === 'moderate') {
      // Moderate simplification
      return sentences
        .map(sentence => sentence.trim())
        .filter(Boolean)
        .join('. ') + '.';
    } else {
      // Advanced - mostly preserve original with some cleanup
      return text.replace(/\s+/g, ' ').trim();
    }
  };

  const handleCopySimplified = async () => {
    if (!simplifiedText) return;
    
    try {
      await navigator.clipboard.writeText(simplifiedText);
      toast({
        title: "Copied to clipboard",
        description: "Simplified text has been copied."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy text to clipboard.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setSimplifiedText('');
    setCustomText('');
    setUseCustomText(false);
  };

  const getContentSource = () => {
    if (useCustomText && customText.trim()) {
      return "Custom text input";
    }
    if (originalText && originalText.length > 0) {
      return `Selected text (${originalText.split(' ').length} words)`;
    }
    return "No content selected";
  };

  const hasTextToSimplify = getTextToSimplify().length > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <Type className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-text-primary">Text Simplifier</h3>
        </div>
        <p className="text-xs text-text-secondary">
          Make complex text easier to understand with AI
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Content Source Indicator */}
          <div className="flex items-center gap-2 p-3 bg-surface-elevated rounded-lg">
            {hasTextToSimplify ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-text-primary">{getContentSource()}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-text-secondary">Select text in PDF or enter custom text</span>
              </>
            )}
          </div>

          {/* Custom Text Input Toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomText"
                checked={useCustomText}
                onChange={(e) => {
                  setUseCustomText(e.target.checked);
                  if (!e.target.checked) {
                    setCustomText('');
                  }
                }}
                className="rounded"
              />
              <label htmlFor="useCustomText" className="text-sm font-medium text-text-primary">
                Use custom text instead of selection
              </label>
            </div>

            {useCustomText && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter the text you want to simplify..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="text-sm"
                  rows={4}
                />
                <div className="text-xs text-text-tertiary">
                  {customText.split(' ').filter(Boolean).length} words
                </div>
              </div>
            )}
          </div>

          {/* Difficulty Level Selection */}
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              Difficulty Level
            </label>
            <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficultyLevels.map((level) => {
                  const Icon = level.icon;
                  return (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{level.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {currentLevel && (
              <div className="mt-2">
                <Badge className={currentLevel.color}>
                  {currentLevel.description}
                </Badge>
              </div>
            )}
          </div>

          {/* Simplify Button */}
          <Button 
            onClick={handleSimplify}
            disabled={!hasTextToSimplify || isSimplifying}
            className="w-full gap-2"
          >
            {isSimplifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Simplifying...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Simplify Text
              </>
            )}
          </Button>

          {!hasTextToSimplify && (
            <div className="text-xs text-text-secondary bg-background-secondary p-3 rounded-lg">
              💡 <strong>Tip:</strong> Select any text in the PDF viewer to simplify it, or check the custom text option above.
            </div>
          )}

          {/* Original Text Preview */}
          {hasTextToSimplify && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-text-secondary">
                  Original Text ({getTextToSimplify().split(' ').length} words)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-text-secondary max-h-20 overflow-y-auto">
                  {getTextToSimplify().substring(0, 300)}
                  {getTextToSimplify().length > 300 && '...'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Simplified Text */}
          {simplifiedText && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-text-primary">
                    Simplified Text ({currentLevel?.label} Level)
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopySimplified}
                      className="p-1"
                      title="Copy simplified text"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="p-1"
                      title="Reset and start over"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-60">
                  <div className="text-sm text-text-primary leading-relaxed">
                    {simplifiedText}
                  </div>
                </ScrollArea>
                <div className="mt-2 text-xs text-text-tertiary">
                  {simplifiedText.split(' ').length} words ({Math.round((simplifiedText.split(' ').length / getTextToSimplify().split(' ').length) * 100)}% of original)
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Tips */}
          <Card className="bg-surface-subtle">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">How to Use</h4>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>• <strong>Select text:</strong> Highlight any text in the PDF viewer</li>
                <li>• <strong>Choose level:</strong> Pick difficulty based on your audience</li>
                <li>• <strong>Custom text:</strong> Enter your own text to simplify</li>
                <li>• <strong>Copy result:</strong> Use simplified text for notes or sharing</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}