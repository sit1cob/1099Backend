/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          900: '#0f172a'
        },
        sidebar: {
          bg: '#0f1535',
          hover: '#1a2147',
          active: '#243056',
          text: '#8b92ab',
          textActive: '#ffffff',
        },
        kpi: {
          green: '#10b981',
          blue: '#3b82f6',
          orange: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    }
  },
  plugins: []
};

