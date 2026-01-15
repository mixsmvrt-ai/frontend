/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          bg: "#050608",
          surface: "#0b0d13",
          surfaceMuted: "#101321",
          primary: "#E10600",
          accent: "#22d3ee",
          text: "#F9FAFB",
          muted: "#9CA3AF",
        },
        "mix-neon": {
          green: "#22c55e",
          cyan: "#22d3ee",
          violet: "#a855f7",
        },
      },
      boxShadow: {
        "neon-soft": "0 0 40px rgba(34,197,94,0.45)",
        "panel": "0 0 55px rgba(15,23,42,0.95)",
      },
    },
  },
  plugins: [],
};
