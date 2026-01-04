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
          dark: 'hsl(206, 100%, 24%)', // Deeper Azure
          primary: 'hsl(206, 100%, 34%)', // Azure Blue Accent
          light: 'hsl(206, 100%, 96%)', // Light Azure tint
          bg: '#ffffff', // White Background
          text: 'hsl(0, 0%, 0%)', // Pure Black Text
          muted: 'hsl(0, 0%, 40%)', // Neutral Muted
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.04)',
        'card-hover': '0 0 0 1px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.1), 0 16px 32px rgba(0,0,0,0.08)',
        'modal': '0 0 0 1px rgba(0,0,0,0.08), 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 15px hsla(206, 100%, 34%, 0.4)',
      }
    },
  },
  plugins: [],
}
