import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0b0c",
          elevated: "#141417",
          card: "#17171c",
          border: "#26262d",
        },
        accent: {
          DEFAULT: "#3b82f6",
          bright: "#1e90ff",
          glow: "#60a5fa",
        },
        text: {
          primary: "#f4f4f5",
          secondary: "#a1a1aa",
          muted: "#71717a",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(30, 144, 255, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
