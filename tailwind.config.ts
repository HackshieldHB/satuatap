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
        // SATU ATAP "Smart Living" palette — soft, warm, residential.
        // Primary = Dusty Blue; Secondary = Powder Blue; accents peach/sage.
        primary: {
          DEFAULT: "#7895AC", // Dusty Blue
          foreground: "#FFFFFF",
          hover: "#5F7C93",
          light: "#EDF2F6",
        },
        secondary: {
          DEFAULT: "#7FA6C2", // Powder Blue (readable; lighter than primary)
          foreground: "#FFFFFF",
          hover: "#6B93B0",
          light: "#EEF4F8",
        },
        accent: {
          DEFAULT: "#E9B89B", // Soft Peach (warm accent)
          foreground: "#263746",
        },
        success: {
          DEFAULT: "#6E9A6A", // Sage (readable), for online/active/done
          light: "#EAF1E7",
        },
        info: {
          DEFAULT: "#5B95CE", // Soft Blue, for water/internet/in-progress
          light: "#EAF2F9",
        },
        warning: {
          DEFAULT: "#F4A261", // Warm Amber, for electricity/warning/pending
          light: "#FDF1E7",
        },
        error: {
          DEFAULT: "#E27B6B", // Soft Coral (desaturated red)
          light: "#FBEDEA",
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
