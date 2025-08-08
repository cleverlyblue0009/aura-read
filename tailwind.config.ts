import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				/* Brand Colors */
				'brand-primary': 'hsl(var(--brand-primary))',
				'brand-secondary': 'hsl(var(--brand-secondary))',
				'brand-accent': 'hsl(var(--brand-accent))',
				
				/* Surface Colors */
				background: 'hsl(var(--background))',
				'background-secondary': 'hsl(var(--background-secondary))',
				'background-tertiary': 'hsl(var(--background-tertiary))',
				foreground: 'hsl(var(--foreground))',
				'foreground-secondary': 'hsl(var(--foreground-secondary))',
				
				/* Interactive States */
				'surface-elevated': 'hsl(var(--surface-elevated))',
				'surface-hover': 'hsl(var(--surface-hover))',
				'surface-active': 'hsl(var(--surface-active))',
				'surface-selected': 'hsl(var(--surface-selected))',
				
				/* PDF Viewer Specific */
				'pdf-background': 'hsl(var(--pdf-background))',
				'pdf-shadow': 'hsl(var(--pdf-shadow))',
				'outline-background': 'hsl(var(--outline-background))',
				'highlight-primary': 'hsl(var(--highlight-primary))',
				'highlight-secondary': 'hsl(var(--highlight-secondary))',
				'highlight-tertiary': 'hsl(var(--highlight-tertiary))',
				
				/* Accessibility Colors */
				'focus-ring': 'hsl(var(--focus-ring))',
				success: 'hsl(var(--success))',
				warning: 'hsl(var(--warning))',
				error: 'hsl(var(--error))',
				
				/* Text Hierarchy */
				'text-primary': 'hsl(var(--text-primary))',
				'text-secondary': 'hsl(var(--text-secondary))',
				'text-tertiary': 'hsl(var(--text-tertiary))',
				'text-on-brand': 'hsl(var(--text-on-brand))',
				
				/* Borders & Dividers */
				'border-subtle': 'hsl(var(--border-subtle))',
				'border-moderate': 'hsl(var(--border-moderate))',
				'border-strong': 'hsl(var(--border-strong))',
				
				/* Legacy support for shadcn components */
				border: 'hsl(var(--border-subtle))',
				input: 'hsl(var(--border-subtle))',
				ring: 'hsl(var(--focus-ring))',
				primary: {
					DEFAULT: 'hsl(var(--brand-primary))',
					foreground: 'hsl(var(--text-on-brand))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--background-secondary))',
					foreground: 'hsl(var(--text-primary))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--error))',
					foreground: 'hsl(var(--text-on-brand))'
				},
				muted: {
					DEFAULT: 'hsl(var(--background-secondary))',
					foreground: 'hsl(var(--text-secondary))'
				},
				accent: {
					DEFAULT: 'hsl(var(--brand-accent))',
					foreground: 'hsl(var(--text-primary))'
				},
				popover: {
					DEFAULT: 'hsl(var(--surface-elevated))',
					foreground: 'hsl(var(--text-primary))'
				},
				card: {
					DEFAULT: 'hsl(var(--surface-elevated))',
					foreground: 'hsl(var(--text-primary))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--outline-background))',
					foreground: 'hsl(var(--text-primary))',
					primary: 'hsl(var(--brand-primary))',
					'primary-foreground': 'hsl(var(--text-on-brand))',
					accent: 'hsl(var(--surface-hover))',
					'accent-foreground': 'hsl(var(--text-primary))',
					border: 'hsl(var(--border-subtle))',
					ring: 'hsl(var(--focus-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
