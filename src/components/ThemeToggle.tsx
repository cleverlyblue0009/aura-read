import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';
type ColorScheme = 'default' | 'ocean' | 'forest';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('default');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply theme
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply color scheme
    root.classList.remove('theme-ocean', 'theme-forest');
    if (colorScheme !== 'default') {
      root.classList.add(`theme-${colorScheme}`);
    }
  }, [theme, colorScheme]);

  const themeOptions = [
    { value: 'light' as Theme, label: 'Light', icon: Sun },
    { value: 'dark' as Theme, label: 'Dark', icon: Moon },
    { value: 'system' as Theme, label: 'System', icon: Monitor }
  ];

  const colorSchemeOptions = [
    { value: 'default' as ColorScheme, label: 'Default', color: 'hsl(217, 91%, 60%)' },
    { value: 'ocean' as ColorScheme, label: 'Ocean', color: 'hsl(200, 85%, 50%)' },
    { value: 'forest' as ColorScheme, label: 'Forest', color: 'hsl(142, 76%, 36%)' }
  ];

  const currentThemeIcon = themeOptions.find(option => option.value === theme)?.icon || Monitor;
  const CurrentIcon = currentThemeIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-2"
          aria-label="Toggle theme"
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {label}
            {theme === value && (
              <div className="ml-auto h-2 w-2 bg-brand-primary rounded-full" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Color Scheme</DropdownMenuLabel>
        
        {colorSchemeOptions.map(({ value, label, color }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setColorScheme(value)}
            className="gap-2"
          >
            <div 
              className="h-4 w-4 rounded-full border border-border-subtle"
              style={{ backgroundColor: color }}
            />
            {label}
            {colorScheme === value && (
              <div className="ml-auto h-2 w-2 bg-brand-primary rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}