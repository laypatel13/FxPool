/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#23262b",
          raised: "#23262b", // In neumorphism, raised surfaces share the base background
        },
        surface: {
          1: "#23262b",
          2: "#23262b",
          3: "#23262b",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.03)",
          strong: "rgba(255,255,255,0.08)",
          accent: "rgba(255,255,255,0.15)", // No more cyan
        },
        accent: {
          DEFAULT: "#ffffff", // Pure white for accent (monochrome)
          dim: "#cccccc",
          soft: "rgba(255,255,255,0.1)",
        },
        ink: {
          DEFAULT: "#F8FAFC",
          muted: "#94A3B8",
          faint: "#5B6B84",
        },
        signal: {
          up: "#A3A3A3", // Replaced green with gray for monochrome
          down: "#737373", // Replaced red with gray for monochrome
          warn: "#D4D4D4", // Replaced yellow with gray for monochrome
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "18px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        neu: "8px 8px 16px #1a1c20, -8px -8px 16px #2c3036",
        "neu-sm": "4px 4px 8px #1a1c20, -4px -4px 8px #2c3036",
        "neu-inset": "inset 5px 5px 10px #1a1c20, inset -5px -5px 10px #2c3036",
        "neu-active": "inset 3px 3px 6px #1a1c20, inset -3px -3px 6px #2c3036",
        "neu-lg": "15px 15px 30px #15171a, -15px -15px 30px #31353c",
        card: "8px 8px 16px #1a1c20, -8px -8px 16px #2c3036", // alias for neu
      },
      transitionTimingFunction: {
        instrument: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
