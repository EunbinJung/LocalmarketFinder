/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#F1E7E7',
        primary: '#E69DB8',
        secondary: '#FFD0C7',
        tertiary: '#FFF7F3',
      },
    },
  },
  plugins: [],
};
