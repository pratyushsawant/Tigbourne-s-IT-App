/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fbf7ed',
          100: '#f5ecd2',
          200: '#ebd8a4',
          300: '#dfbe6e',
          400: '#d4a749',
          500: '#c8922f',
          600: '#b07523',
          700: '#8f581f',
          800: '#754720',
          900: '#623c1e',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          soft: '#3c3c43',
          muted: '#6e6e73',
          faint: '#8e8e93',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        float: '0 4px 12px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.10)',
        gold: '0 6px 20px rgba(200,146,47,0.28)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.8s ease both',
        shimmer: 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
}
