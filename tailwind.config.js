/** @type {import('tailwindcss').Config} */
export default {
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
        promed: {
          dark: '#0f3d39', // Deepest Teal - High contrast for sidebar
          primary: '#0D7A72', // Darker Teal - WCAG AA compliant on white
          light: '#E0F2F1', // Very light mint for backgrounds
          bg: '#F1F5F9', // Slate 100 - Distinct from white cards
          text: '#0F172A', // Slate 900 - Max contrast text
          muted: '#64748B', // Slate 500 - Readable secondary text
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.04)',
        'card-hover': '0 0 0 1px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.1), 0 16px 32px rgba(0,0,0,0.08)',
        'modal': '0 0 0 1px rgba(0,0,0,0.08), 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 15px rgba(13, 122, 114, 0.4)',
      }
    },
  },
  plugins: [],
}
