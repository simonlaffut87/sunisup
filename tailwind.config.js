/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
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