/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ecotribe: {
          primary: '#84CC16',
          'light-primary': '#4D7C0F',
          secondary: '#365314',
          tertiary: '#ECFCCB',
          dark: '#050505',
          light: '#FAFAFA',
          text: '#0F172A',
        },
        comprint: {
          primary: '#FFFFFF',
          'light-primary': '#2563EB',
          secondary: '#2563EB',
          tertiary: '#93C5FD',
        }
      },
      fontFamily: {
        brand: ['Chakra Petch', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['Inter', 'monospace'],
        accent: ['Playfair Display', 'serif'],
      },
      backgroundImage: {
        'grain': "url('https://grainy-gradients.vercel.app/noise.svg')",
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s infinite alternate',
        'aurora': 'aurora 15s ease-in-out infinite',
        'breathe': 'breathe 12s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%': { boxShadow: '0 0 5px #84CC16, 0 0 10px #84CC16' },
          '100%': { boxShadow: '0 0 20px #84CC16, 0 0 30px #84CC16' },
        },
        'aurora': {
          '0%, 100%': { transform: 'scale(1) translateX(0)', opacity: '0.3' },
          '50%': { transform: 'scale(1.2) translateX(50px)', opacity: '0.5' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'fixed': '30',
        'sidebar': '40',
        'header': '50',
        'overlay': '60',
        'modal': '70',
        'popover': '80',
        'tooltip': '90',
        'toast': '100',
        'cursor': '9000',
        'grain': '9999',
      },
      transitionDuration: {
        'fastest': '100ms',
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      }
    }
  },
  plugins: [],
}
