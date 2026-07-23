/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A', // Deep blue/slate for main background
          surface: '#1E293B', // Slightly lighter for cards/surfaces
          border: '#334155',
        },
        primary: {
          DEFAULT: '#FF5722', // Fiery orange matching logo
          light: '#FF7043',
          dark: '#E64A19',
        }
      }
    },
  },
  plugins: [],
}