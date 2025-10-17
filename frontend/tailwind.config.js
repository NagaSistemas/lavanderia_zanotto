/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#60a5fa",
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
        },
        accent: "#f97316",
        surface: "#f8fafc",
      },
    },
  },
  plugins: [],
};
