/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
      "./*.{js,ts,jsx,tsx}",  // Added this line to catch files in root
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }