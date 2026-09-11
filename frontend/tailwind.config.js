/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
        },
        surface: "var(--surface)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          secondary: "var(--accent-secondary)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        display: ["Orbitron", "Rajdhani", "sans-serif"],
        body: ["Rajdhani", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        hud: "0 0 0 1px var(--border), 0 0 18px color-mix(in srgb, var(--accent) 18%, transparent)",
        glow: "0 0 12px color-mix(in srgb, var(--accent) 35%, transparent)",
      },
    },
  },
  plugins: [],
};
