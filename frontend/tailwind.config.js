/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#050B14",
          raised: "#080F1A",
        },
        surface: {
          1: "#111827",
          2: "#1A2234",
          3: "#212B40",
        },
        line: {
          DEFAULT: "rgba(248,250,252,0.08)",
          strong: "rgba(248,250,252,0.14)",
          accent: "rgba(0,209,199,0.35)",
        },
        accent: {
          DEFAULT: "#00D1C7",
          dim: "#0BA69F",
          soft: "rgba(0,209,199,0.12)",
        },
        ink: {
          DEFAULT: "#F8FAFC",
          muted: "#94A3B8",
          faint: "#5B6B84",
        },
        signal: {
          up: "#3DD9A4",
          down: "#F0765A",
          warn: "#E8B96A",
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
        card: "0 1px 0 rgba(248,250,252,0.04) inset, 0 24px 48px -24px rgba(0,0,0,0.65)",
        raised: "0 1px 0 rgba(248,250,252,0.06) inset, 0 32px 64px -28px rgba(0,0,0,0.75)",
        glow: "0 0 0 1px rgba(0,209,199,0.4), 0 0 32px rgba(0,209,199,0.12)",
      },
      backgroundImage: {
        dotgrid: "radial-gradient(rgba(248,250,252,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        dotgrid: "22px 22px",
      },
      transitionTimingFunction: {
        instrument: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
