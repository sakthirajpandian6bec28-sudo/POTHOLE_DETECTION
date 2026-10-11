import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        small: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        h4: ["20px", { lineHeight: "28px", fontWeight: "500" }],
        h3: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        h2: ["36px", { lineHeight: "44px", fontWeight: "600" }],
        h1: ["48px", { lineHeight: "56px", fontWeight: "600" }],
        // Mobile type overrides
        "h1-mobile": ["36px", { lineHeight: "44px", fontWeight: "600" }],
        "h2-mobile": ["28px", { lineHeight: "36px", fontWeight: "600" }],
      },
      spacing: {
        1: "8px",
        2: "16px",
        3: "24px",
        4: "32px",
        5: "40px",
        6: "48px",
        7: "56px",
        8: "64px",
        10: "80px",
        12: "96px",
      },
      maxWidth: {
        content: "1200px",
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "8px",
      },
      colors: {
        // Primary (interactive elements only: buttons, links, focus rings, active nav)
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          DEFAULT: "var(--color-primary-600)",
        },
        "primary-50": "var(--color-primary-50)",
        "primary-100": "var(--color-primary-100)",
        "primary-600": "var(--color-primary-600)",
        "primary-700": "var(--color-primary-700)",

        // Accent tokens
        "accent-400": "var(--color-accent-400)",
        "accent-700": "var(--color-accent-700)",
        accent: {
          400: "var(--color-accent-400)",
          700: "var(--color-accent-700)",
        },

        // Ink & Text tokens
        "ink-900": "var(--color-ink-900)",
        "ink-800": "var(--color-ink-800)",
        ink: {
          800: "var(--color-ink-800)",
          900: "var(--color-ink-900)",
        },
        "text-body": "var(--color-text-body)",
        "text-muted": "var(--color-text-muted)",

        // Backgrounds & Surface & Borders
        "bg-page": "var(--color-bg-page)",
        "bg-surface": "var(--color-bg-surface)",
        "border-default": "var(--color-border-default)",
        surface: "var(--color-bg-surface)",
        page: "var(--color-bg-page)",

        // Severity Semantics (Severity only, soft variants for badge bg)
        "sev-low": "var(--color-sev-low)",
        "sev-low-soft": "var(--color-sev-low-soft)",
        "sev-medium": "var(--color-sev-medium)",
        "sev-medium-soft": "var(--color-sev-medium-soft)",
        "sev-high": "var(--color-sev-high)",
        "sev-high-soft": "var(--color-sev-high-soft)",

        // Action Feedback
        danger: "var(--color-danger)",
        success: "var(--color-success)",
      },
      backgroundImage: {
        "hero-gradient": "var(--gradient-hero)",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(11, 18, 32, 0.05)",
        card: "0 1px 3px 0 rgba(11, 18, 32, 0.08), 0 1px 2px -1px rgba(11, 18, 32, 0.08)",
      },
      transitionDuration: {
        subtle: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
