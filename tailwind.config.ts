import type { Config } from "tailwindcss";

// Design tokens: see DESIGN.md. Warm neutral "slate" scale (ink #222222, hairline #dddddd)
// with LiftCrew blue as the single accent.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        },
        slate: {
          50: "#f7f7f7",
          100: "#f2f2f2",
          200: "#dddddd",
          300: "#c1c1c1",
          400: "#929292",
          500: "#6a6a6a",
          600: "#5e5e5e",
          700: "#3f3f3f",
          800: "#2d2d2d",
          900: "#222222",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "system-ui", "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        float: "0 0 0 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
