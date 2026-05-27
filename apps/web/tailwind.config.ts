import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "PT Sans", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Merriweather", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"]
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          muted: "hsl(var(--primary-muted))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          light: "hsl(var(--muted-light))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))"
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "text-reveal": {
          from: { "clip-path": "inset(0 100% 0 0)" },
          to: { "clip-path": "inset(0 0 0 0)" }
        },
        "geo-slide": {
          from: { transform: "translateX(-20px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" }
        },
        "page-turn": {
          "0%": { "clip-path": "polygon(0 0, 0 0, 0 100%, 0 100%)" },
          "100%": { "clip-path": "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }
        },
        "geo-fade-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "text-reveal": "text-reveal 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        "geo-slide": "geo-slide 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        "page-turn": "page-turn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        "geo-fade-in": "geo-fade-in 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards"
      },
      boxShadow: {
        "constructivist": "4px 4px 0px hsl(var(--primary) / 0.08)",
        "constructivist-hover": "6px 6px 0px hsl(var(--primary) / 0.15)"
      },
      transitionTimingFunction: {
        "constructivist": "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
