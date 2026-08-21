import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF7A59",
          foreground: "#FFFFFF",
          hover: "#FF6340",
          light: "#FFF0EC",
        },
        secondary: {
          DEFAULT: "#5BC0BE",
          foreground: "#FFFFFF",
          hover: "#4AA8A6",
          light: "#E8F8F8",
        },
        accent: {
          DEFAULT: "#FFD166",
          foreground: "#1F2937",
        },
        success: {
          DEFAULT: "#43AA8B",
          light: "#E8F5F0",
        },
        info: {
          DEFAULT: "#4D96FF",
          light: "#EBF3FF",
        },
        warning: {
          DEFAULT: "#F4A261",
          light: "#FEF3E8",
        },
        error: {
          DEFAULT: "#E76F51",
          light: "#FDEEEA",
        },
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        hero: "24px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.05)",
        floating: "0 8px 24px rgba(0, 0, 0, 0.08)",
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pop-in": "popIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 4s ease-in-out infinite",
        wiggle: "wiggle 0.5s ease-in-out",
        "gradient-x": "gradientX 6s ease infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-8deg)" },
          "75%": { transform: "rotate(8deg)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "safe-top": "env(safe-area-inset-top, 0px)",
      },
    },
  },
  plugins: [],
};

export default config;
