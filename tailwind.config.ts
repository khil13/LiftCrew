import type { Config } from "tailwindcss";

// Design tokens: see DESIGN.md. 60-30-10 palette:
//   60% light canvas: white and slate-50 (#F5F7FC)
//   30% deep navy:    slate-900 / navy (#202B45) for headings, nav, footer, key bands
//   10% LiftCrew blue: brand-600 (#3154DE) for primary actions, links, highlights
// The slate scale is a cool neutral ramp that ends in the brand navy, so existing
// slate-* classes pick up the new palette everywhere.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2fd",
          100: "#dce3fb",
          200: "#b9c7f6",
          500: "#4a69e4",
          600: "#3154de",
          700: "#2541b5",
          800: "#1e3592",
        },
        navy: "#202b45",
        slate: {
          50: "#f5f7fc",
          100: "#eef1f8",
          200: "#dfe4ef",
          300: "#c5ccdb",
          400: "#8c94a8",
          500: "#5b6478",
          600: "#4b5468",
          700: "#384157",
          800: "#2a344d",
          900: "#202b45",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(32,43,69,0.05), 0 2px 8px rgba(32,43,69,0.05)",
        float: "0 1px 2px rgba(32,43,69,0.06), 0 8px 24px rgba(32,43,69,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
