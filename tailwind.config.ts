import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: "#1f7a5a",
        ink: "#18211f",
        line: "#d8dedb",
        notice: "#f4b740"
      }
    }
  },
  plugins: []
};

export default config;
