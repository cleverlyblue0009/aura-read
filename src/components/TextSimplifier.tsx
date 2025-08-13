import { useState } from 'react';
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
  RotateCcw
} from 'lucide-react';

interface TextSimplifierProps {
  originalText?: string;
  onSimplifiedText?: (text: string) => void;
}

export function TextSimplifier({ originalText, onSimplifiedText }: TextSimplifierProps) {
  const [difficultyLevel, setDifficultyLevel] = useState<string>('simple');
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [isSimplifying, setIsSimplifying] = useState(false);
  const { toast } = useToast();

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

  const handleSimplify = async () => {
    if (!originalText?.trim()) {
      toast({
        title: "No text to simplify",
        description: "Please provide text to simplify.",
        variant: "destructive"
      });
      return;
    }

    setIsSimplifying(true);
    try {
      const simplified = await apiService.simplifyText(originalText, difficultyLevel);
      setSimplifiedText(simplified);
      
      if (onSimplifiedText) {
        onSimplifiedText(simplified);
      }
      
      toast({
        title: "Text simplified",
        description: `Successfully simplified text to ${difficultyLevel} level.`
      });
      
    } catch (error) {
      console.error('Failed to simplify text:', error);
      toast({
        title: "Simplification failed",
        description: "Unable to simplify text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSimplifying(false);
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
  };

  const currentLevel = difficultyLevels.find(level => level.value === difficultyLevel);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-text-primary">Text Simplifier</h3>
        </div>
        <p className="text-xs text-text-secondary">
          Make complex text easier to understand with AI
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
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
            disabled={!originalText || isSimplifying}
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

          {/* Original Text Preview */}
          {originalText && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-text-secondary">Original Text</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-text-secondary max-h-20 overflow-y-auto">
                  {originalText.substring(0, 200)}
                  {originalText.length > 200 && '...'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Simplified Text */}
          {simplifiedText && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-text-primary">Simplified Text</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopySimplified}
                      className="p-1"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="p-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-72">
                  <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {simplifiedText}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Usage Tips */}
          <Card className="bg-surface-subtle">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">Usage Tips</h4>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>• Select text in the PDF to simplify specific sections</li>
                <li>• Choose difficulty level based on your needs</li>
                <li>• Copy simplified text for notes or sharing</li>
                <li>• Use with voice reading for better comprehension</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}