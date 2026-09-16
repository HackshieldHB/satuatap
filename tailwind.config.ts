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
        // SATU ATAP "Sage" palette — premium PropTech, calm & natural.
        // Primary = Sage Green; deeper forest-sage for hover/accents.
        primary: {
          DEFAULT: "#8A9A86", // Soft/Muted Sage
          foreground: "#FFFFFF",
          hover: "#6E7F6A", // Darker forest-sage
          light: "#EFF2ED",
        },
        secondary: {
          DEFAULT: "#5F7268", // Deep sage-slate (readable supporting tone)
          foreground: "#FFFFFF",
          hover: "#4E5E55",
          light: "#ECF0EE",
        },
        accent: {
          DEFAULT: "#C9B48A", // Soft sand/gold warm accent
          foreground: "#1F2937",
        },
        success: {
          DEFAULT: "#6E9A6A", // Pastel green — online/active/done
          light: "#EAF1E7",
        },
        info: {
          DEFAULT: "#6E93AC", // Soft slate-blue — water/internet/in-progress
          light: "#EAF0F5",
        },
        warning: {
          DEFAULT: "#D8A93E", // Soft yellow — warning/proses/pending
          light: "#FAF3E0",
        },
        error: {
          DEFAULT: "#D9736A", // Soft red — offline/nonaktif/critical
          light: "#FBEBE9",
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
