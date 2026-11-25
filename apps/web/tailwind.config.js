/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#080B1B",
        surface: "#10152B",
        card: "#141A35",
        pink: "#FF00C8",
        cyan: "#00E5FF",
      },
      boxShadow: {
        neon: "0 0 24px rgba(255, 0, 200, 0.28)",
      },
    },
  },
  plugins: [],
};
