/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a2332",
        leaf: "#2f6b4f",
        cream: "#f7f4ef",
        sand: "#e8e0d4",
        accent: "#c45c26",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
