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
        // SATU ATAP "Fresh Green Modern Smart Living" palette — layered teal/
        // sage/mint over airy ivory, with soft pastel semantic accents.
        primary: {
          DEFAULT: "#4F9690", // Primary Teal
          foreground: "#FFFFFF",
          hover: "#1F5F5B", // Deep Teal
          light: "#E1EFEB", // Pale Mint
        },
        secondary: {
          DEFAULT: "#5E938B", // Readable muted sage-teal
          foreground: "#FFFFFF",
          hover: "#4C7A73",
          light: "#EDF5F1", // Mist Green
        },
        accent: {
          DEFAULT: "#A8C9BE", // Soft Sage (decorative)
          foreground: "#263B39",
        },
        success: {
          DEFAULT: "#65A77B", // Success Green — online/active/done
          light: "#E7F0EA",
        },
        info: {
          DEFAULT: "#5CA7D5", // Soft Blue — water/internet/info
          light: "#E6F1F9",
        },
        warning: {
          DEFAULT: "#F2A84B", // Soft Amber — electricity/warning
          light: "#FDF1E1",
        },
        error: {
          DEFAULT: "#EF7775", // Soft Coral — offline/error/destructive
          light: "#FCEBEA",
        },
        // Smart / automation surfaces.
        ai: {
          DEFAULT: "#8583D9", // Soft Violet
          light: "#ECEBF8",
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
