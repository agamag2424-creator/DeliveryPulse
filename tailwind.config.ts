import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "background-primary": "#0A0F1C",
        "background-card": "#111827",
        "background-elevated": "#1F2937",
        border: "#374151",
        "text-primary": "#F9FAFB",
        "text-secondary": "#9CA3AF",
        "text-muted": "#6B7280",
        "accent-blue": "#3B82F6",
        "rag-red": "#EF4444",
        "rag-amber": "#F59E0B",
        "rag-green": "#10B981",
        "rag-grey": "#6B7280",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
};

export default config;
