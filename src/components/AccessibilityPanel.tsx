import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Type, 
  Eye, 
  Volume2, 
  BookOpen, 
  Accessibility,
  Languages,
  Timer,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

export function AccessibilityPanel() {
  const [fontSize, setFontSize] = useState([16]);
  const [lineHeight, setLineHeight] = useState([1.6]);
  const [dyslexiaMode, setDyslexiaMode] = useState(false);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [voiceReading, setVoiceReading] = useState(false);
  const [simplifyText, setSimplifyText] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(true);
  const [readingTimer, setReadingTimer] = useState(false);

  const readingModes = [
    { id: 'normal', label: 'Normal', active: !dyslexiaMode && !colorBlindMode },
    { id: 'dyslexia', label: 'Dyslexia Friendly', active: dyslexiaMode },
    { id: 'colorblind', label: 'Color Blind Friendly', active: colorBlindMode }
  ];

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', label: 'French', flag: '🇫🇷' },
    { code: 'de', label: 'German', flag: '🇩🇪' },
    { code: 'zh', label: 'Chinese', flag: '🇨🇳' }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <Accessibility className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-text-primary">Accessibility</h3>
        </div>
        <p className="text-xs text-text-secondary">
          Customize reading experience for comfort and accessibility
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Typography Settings */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Type className="h-4 w-4 text-text-secondary" />
              <h4 className="text-sm font-medium text-text-primary">Typography</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-text-secondary">Font Size</label>
                  <span className="text-xs text-text-tertiary">{fontSize[0]}px</span>
                </div>
                <Slider
                  value={fontSize}
                  onValueChange={setFontSize}
                  min={12}
                  max={24}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-text-secondary">Line Height</label>
                  <span className="text-xs text-text-tertiary">{lineHeight[0]}</span>
                </div>
                <Slider
                  value={lineHeight}
                  onValueChange={setLineHeight}
                  min={1.2}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Reading Modes */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-text-secondary" />
              <h4 className="text-sm font-medium text-text-primary">Reading Modes</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Dyslexia Friendly</label>
                <Switch
                  checked={dyslexiaMode}
                  onCheckedChange={setDyslexiaMode}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Color Blind Friendly</label>
                <Switch
                  checked={colorBlindMode}
                  onCheckedChange={setColorBlindMode}
                />
              </div>

              <div className="flex gap-1 flex-wrap">
                {readingModes.map(mode => (
                  <Badge
                    key={mode.id}
                    variant={mode.active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {mode.label}
                  </Badge>
                ))}
              </div>
            </div>
          </section>

          {/* Voice Features */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="h-4 w-4 text-text-secondary" />
              <h4 className="text-sm font-medium text-text-primary">Voice Features</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Voice Reading</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVoiceReading(!voiceReading)}
                    className="p-1"
                  >
                    {voiceReading ? (
                      <PauseCircle className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <Switch
                    checked={voiceReading}
                    onCheckedChange={setVoiceReading}
                  />
                </div>
              </div>
              
              {voiceReading && (
                <div className="pl-4 space-y-2 animate-fade-in">
                  <div className="text-xs text-text-tertiary">
                    Reading speed: Normal • Voice: Sarah (US English)
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs">
                      Slower
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      Faster
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Text Simplification */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-text-secondary" />
              <h4 className="text-sm font-medium text-text-primary">Text Enhancement</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Simplify Complex Words</label>
                <Switch
                  checked={simplifyText}
                  onCheckedChange={setSimplifyText}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Show Definitions on Hover</label>
                <Switch
                  checked={showDefinitions}
                  onCheckedChange={setShowDefinitions}
                />
              </div>
            </div>
          </section>

          {/* Language Support */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Languages className="h-4 w-4 text-text-secondary" />
              <h4 className="text-sm font-medium text-text-primary">Language</h4>
            </div>
            
            <div className="space-y-2">
              {languages.map(lang => (
                <Button
                  key={lang.code}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {lang.code === 'en' && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Active
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </section>

          {/* Reading Timer */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Timer className="h-4 w-4 text-text-secondary" />
              <h4 className="text-sm font-medium text-text-primary">Reading Progress</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Show Reading Timer</label>
                <Switch
                  checked={readingTimer}
                  onCheckedChange={setReadingTimer}
                />
              </div>
              
              {readingTimer && (
                <div className="p-3 bg-background-secondary rounded-lg animate-fade-in">
                  <div className="text-xs text-text-secondary mb-1">Session Progress</div>
                  <div className="text-sm font-medium text-text-primary">12 min 34 sec</div>
                  <div className="text-xs text-text-tertiary mt-1">
                    Average reading speed: 250 WPM
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}