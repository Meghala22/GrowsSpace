import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Config } from "tailwindcss";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

export default {
  content: [
    path.join(frontendRoot, "index.html"),
    path.join(frontendRoot, "src/**/*.{ts,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        moss: {
          50: "#f4f8f2",
          100: "#e6efe2",
          200: "#cbdec4",
          300: "#a8c69d",
          400: "#83aa73",
          500: "#648b55",
          600: "#4e6f42",
          700: "#405936",
          800: "#35472f",
          900: "#2d3b29"
        },
        clay: {
          50: "#fff7f0",
          100: "#ffe8d5",
          200: "#ffd0ae",
          300: "#f8ad7a",
          400: "#ef8347",
          500: "#e06723",
          600: "#c24f16",
          700: "#a13b15",
          800: "#823117",
          900: "#6a2a17"
        },
        cream: "#f6f1e7",
        ink: "#1f241d"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(39, 58, 33, 0.12)"
      },
      fontFamily: {
        display: ["'Instrument Serif'", "Georgia", "serif"],
        body: ["'Space Grotesk'", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
