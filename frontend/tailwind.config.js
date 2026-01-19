/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6D4AA2",
        primaryDark: "#4B2E83",
        accent: "#9A7FD1",
        background: "#F4EEFB",
      },
    },
  },
  plugins: [],
};
