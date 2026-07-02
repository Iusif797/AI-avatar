import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        paper: "#f7f3eb",
        coral: "#d65f4d",
        mint: "#6bb7a8",
        violet: "#6957a8"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          ...defaultTheme.fontFamily.sans
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          ...defaultTheme.fontFamily.sans
        ]
      },
      boxShadow: {
        soft: "0 22px 70px rgba(18, 18, 18, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
