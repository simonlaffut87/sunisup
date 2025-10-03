/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#1D8181',
          gold: '#BD9B4B',
          flame: '#D75D2D',
          'teal-light': '#2A9D9D',
          'gold-light': '#D4B366',
          'flame-light': '#E87A50',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#78350F',
            a: {
              color: '#D97706',
              '&:hover': {
                color: '#92400E',
              },
            },
          },
        },
      },
      keyframes: {
        scale: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};