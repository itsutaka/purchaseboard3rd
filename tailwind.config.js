/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // For classes used in the main HTML file
    "./client/**/*.{js,ts,jsx,tsx}", // For classes used in React components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
