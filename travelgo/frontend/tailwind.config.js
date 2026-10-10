/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B1F3A',
          navyLight: '#132B4F',
          navyDark: '#071527',
          primary: '#0284C7',
          primaryDark: '#0369A1',
          accent: '#F97316',
          accentHover: '#EA580C',
          teal: '#0D9488',
          gold: '#EAB308',
          surface: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
          dark: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(11, 31, 58, 0.08), 0 2px 6px -1px rgba(11, 31, 58, 0.04)',
        'card-hover': '0 12px 30px -4px rgba(11, 31, 58, 0.15), 0 4px 10px -2px rgba(11, 31, 58, 0.06)',
        'glow': '0 0 25px rgba(249, 115, 22, 0.35)',
      }
    },
  },
  plugins: [],
}
