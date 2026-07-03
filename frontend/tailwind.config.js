/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        handwritten: ['Caveat', 'cursive'],
      },
      colors: {
        cream: {
          50:  '#faf7f2',
          100: '#f5f0e8',
          200: '#ede4d0',
          300: '#d4c4a8',
          400: '#bfa882',
          500: '#a08860',
          600: '#8a7560',
          700: '#6b5a45',
          800: '#3d3020',
          900: '#1e1810',
        },
      },
    },
  },
  plugins: [],
}
