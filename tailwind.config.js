/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Crimson Pro"', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        accent: { DEFAULT: '#FF6B6B', dark: '#E85555' },
      },
    },
  },
  plugins: [],
}
