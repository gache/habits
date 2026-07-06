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
          950: '#120e08',
        },
        sage: {
          50:  '#f2f7f2',
          100: '#e2ede0',
          200: '#c5dbc2',
          300: '#a1c49b',
          400: '#7ba873',
          500: '#5c8c54',
          600: '#457040',
          700: '#375a34',
          800: '#2c472a',
          900: '#233a22',
        },
        terracotta: {
          50:  '#fbf1ec',
          100: '#f5ded1',
          200: '#eabca3',
          300: '#dd9975',
          400: '#cf7a52',
          500: '#c2603a',
          600: '#a84d2c',
          700: '#873d24',
          800: '#6b3220',
          900: '#4f2519',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(61, 48, 32, 0.06)',
        soft: '0 4px 20px -4px rgba(61, 48, 32, 0.14)',
      },
    },
  },
  plugins: [],
}
