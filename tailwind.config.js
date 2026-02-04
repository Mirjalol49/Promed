/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
		"./components/**/*.{js,ts,jsx,tsx}",
		"./lib/**/*.{js,ts,jsx,tsx}",
		"./contexts/**/*.{js,ts,jsx,tsx}",
		"./pages/**/*.{js,ts,jsx,tsx}",
		"./App.tsx",
		"./main.tsx",
		"./index.tsx"
	],
	theme: {
		extend: {
			colors: {
				// ProMed branding colors
				promed: {
					dark: 'hsl(244, 86%, 35%)',
					primary: 'hsl(244, 86%, 50%)',
					deep: 'hsl(243, 85%, 28%)',
					light: 'hsl(244, 86%, 96%)',
					bg: '#ffffff',
					text: 'hsl(0, 0%, 0%)',
					muted: 'hsl(0, 0%, 40%)'
				},
				// iOS System Colors
				ios: {
					red: '#FF3B30',
					orange: '#FF9500',
					yellow: '#FFCC00',
					green: '#34C759',
					mint: '#00C7BE',
					teal: '#30B0C7',
					cyan: '#32ADE6',
					blue: '#007AFF',
					indigo: '#5856D6',
					purple: '#AF52DE',
					pink: '#FF2D55',
					brown: '#A2845E',
				},
				// iOS Gray Scale
				'ios-gray': {
					DEFAULT: '#8E8E93',
					2: '#AEAEB2',
					3: '#C7C7CC',
					4: '#D1D1D6',
					5: '#E5E5EA',
					6: '#F2F2F7',
				},
				// Liquid Glass Colors
				glass: {
					white: 'rgba(255, 255, 255, 0.7)',
					light: 'rgba(255, 255, 255, 0.5)',
					ultra: 'rgba(255, 255, 255, 0.3)',
					dark: 'rgba(0, 0, 0, 0.3)',
					border: 'rgba(255, 255, 255, 0.18)',
					'border-strong': 'rgba(255, 255, 255, 0.3)',
				},
				// Shadcn colors
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			// iOS Typography Scale
			fontSize: {
				'large-title': ['34px', { lineHeight: '41px', fontWeight: '700' }],
				'title-1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
				'title-2': ['22px', { lineHeight: '28px', fontWeight: '700' }],
				'title-3': ['20px', { lineHeight: '25px', fontWeight: '600' }],
				'headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
				'body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
				'callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
				'subheadline': ['15px', { lineHeight: '20px', fontWeight: '400' }],
				'footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
				'caption-1': ['12px', { lineHeight: '16px', fontWeight: '400' }],
				'caption-2': ['11px', { lineHeight: '13px', fontWeight: '400' }],
			},
			fontFamily: {
				sans: [
					'-apple-system',
					'BlinkMacSystemFont',
					'SF Pro Text',
					'Inter',
					'system-ui',
					'sans-serif'
				],
				heading: [
					'-apple-system',
					'BlinkMacSystemFont',
					'SF Pro Display',
					'Inter',
					'system-ui',
					'sans-serif'
				]
			},
			boxShadow: {
				// iOS-style shadows
				'ios-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
				'ios-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				'ios-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				'ios-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'ios': '0 2px 8px rgba(0, 0, 0, 0.08)',
				// Liquid Glass shadows
				'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.04)',
				'glass': '0 8px 32px rgba(0, 0, 0, 0.08)',
				'glass-md': '0 8px 32px rgba(0, 0, 0, 0.08)',
				'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.12)',
				'glass-xl': '0 24px 64px rgba(0, 0, 0, 0.16)',
				// Keep existing shadows
				soft: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
				card: '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.04)',
				'card-hover': '0 0 0 1px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.1), 0 16px 32px rgba(0,0,0,0.08)',
				modal: '0 0 0 1px rgba(0,0,0,0.08), 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
				glow: '0 0 15px hsla(244, 86%, 50%, 0.4)',
				premium: '0 4px 12px rgba(0, 0, 0, 0.08)',
				apple: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
				custom: '0 2px 8px rgba(0, 0, 0, 0.08)'
			},
			// iOS Border Radius
			borderRadius: {
				none: '0px',
				sm: '4px',
				DEFAULT: '8px',
				md: '8px',
				lg: '12px',
				xl: '16px',
				'2xl': '20px',
				'3xl': '24px',
				full: '9999px',
			},
			keyframes: {
				float: {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				}
			},
			animation: {
				float: 'float 3s ease-in-out infinite'
			},
			// Backdrop blur and filter support
			backdropBlur: {
				xs: '4px',
				sm: '8px',
				DEFAULT: '12px',
				md: '12px',
				lg: '16px',
				xl: '24px',
				'2xl': '32px',
				'3xl': '40px',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
}
