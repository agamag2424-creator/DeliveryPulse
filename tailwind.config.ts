import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Legacy DP names remapped to Chisoku tokens
        "background-primary": "#f5f4f0",
        "background-card": "#fbfaf7",
        "background-elevated": "#f7f4ee",
        border: "#d4d1c9",
        "text-primary": "#111820",
        "text-secondary": "#5f6a75",
        "text-muted": "#5f6a75",
        // Accent alias: cyan (kept as accent-blue for gradual migrate)
        "accent-blue": "#00a6c8",
        // Chisoku explicit names
        page: "#f5f4f0",
        paper: "#fbfaf7",
        ink: "#111820",
        charcoal: "#1a222c",
        faint: "#e6e4de",
        line: "#d4d1c9",
        cyan: "#00a6c8",
        "cyan-strong": "#007f9c",
        gold: "#a8925f",
        cream: "#fffdf8",
        // Domain RAG (unchanged semantics)
        "rag-red": "#EF4444",
        "rag-amber": "#F59E0B",
        "rag-green": "#10B981",
        "rag-grey": "#6B7280",
      },
      borderRadius: {
        panel: "3px",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        content: "1216px",
      },
    },
  },
};

export default config;
