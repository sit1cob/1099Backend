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
          bg: '#060d1c',
          hover: '#0e1a2e',
          active: '#162236',
          text: '#747a90',
          textActive: '#ffffff',
        },
        kpi: {
          green: '#10b981',
          blue: '#3b82f6',
          orange: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6',
        },
        card: '#162236',
        'app-bg': '#0e1a2e',
        topbar: '#0b1526',
        tx1: '#e6edf8',
        tx2: '#8498b7',
        tx3: '#82889e',
      },
      fontFamily: {
        sans: ["'Inter'", 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'Geist Mono'", 'ui-monospace', "'SF Mono'", 'Menlo', 'monospace'],
      },
      fontSize: {
        'xs-tk': ['11px', { lineHeight: '1' }],
        'sm-tk': ['12px', { lineHeight: '1.5' }],
        'base-tk': ['13px', { lineHeight: '1.5' }],
        'md-tk': ['14px', { lineHeight: '1.25' }],
        'lg-tk': ['16px', { lineHeight: '1.25' }],
        'xl-tk': ['20px', { lineHeight: '1.25' }],
        '2xl-tk': ['24px', { lineHeight: '1.25' }],
        '3xl-tk': ['32px', { lineHeight: '1' }],
      },
      borderRadius: {
        'sm-tk': '8px',
        'tk': '14px',
        'lg-tk': '18px',
        'xl-tk': '24px',
        'pill': '999px',
      },
      spacing: {
        'sp-1': '4px',
        'sp-2': '8px',
        'sp-3': '16px',
        'sp-4': '24px',
        'sp-5': '32px',
        'sp-6': '48px',
      }
    }
  },
  plugins: []
};

