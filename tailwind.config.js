/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#5E1DE0',
          purple: '#755CA2',
          mint: '#41D0A6',
          gold: '#F8BD3D',
          coral: '#FF7D84',
          teal: '#41D0A6',
          flame: '#F8BD3D',
          'indigo-light': '#7E45E8',
          'purple-light': '#8F7BB5',
          'mint-light': '#5EDCB8',
          'gold-light': '#F9CA5E',
          'coral-light': '#FF99A0',
          'teal-light': '#5EDCB8',
          'flame-light': '#F9CA5E',
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