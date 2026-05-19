import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        navy: {
          DEFAULT: "hsl(var(--navy))",
          mid: "hsl(var(--navy-mid))",
          light: "hsl(var(--navy-light))",
        },
        steel: "hsl(var(--steel))",
        blue: {
          DEFAULT: "hsl(var(--blue))",
          light: "hsl(var(--blue-light))",
        },
        sky: "hsl(var(--sky))",
        slate: {
          DEFAULT: "hsl(var(--slate))",
          light: "hsl(var(--slate-light))",
        },
        silver: "hsl(var(--silver))",
        fog: "hsl(var(--fog))",
        paper: "hsl(var(--paper))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          light: "hsl(var(--accent-light))",
          foreground: "hsl(var(--accent-foreground))",
        },
        warn: "hsl(var(--warn))",
        gold: "hsl(var(--gold))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'DM Mono'", "ui-monospace", "monospace"],
      },
      // Site-wide bold de-amplification (~15%). Each Tailwind font-weight
      // utility is mapped one notch lighter so previously "too heavy" text
      // reads cleaner without touching individual components:
      //   font-semibold  600 → 500
      //   font-bold      700 → 600
      //   font-extrabold 800 → 700
      //   font-black     900 → 800
      // Lighter weights are unchanged.
      fontWeight: {
        thin: "100",
        extralight: "200",
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "500",
        bold: "600",
        extrabold: "700",
        black: "800",
      },
      // Restore industry-standard Tailwind sizes (previously bumped to 15/17).
      // .text-body (16px) remains the semantic body utility; text-base also = 16px.
      fontSize: {
        sm: ['14px', { lineHeight: '1.55' }],
        base: ['16px', { lineHeight: '1.65' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        "eup-sm": "0 1px 3px rgba(13,31,53,0.08), 0 1px 2px rgba(13,31,53,0.06)",
        "eup-md": "0 4px 12px rgba(13,31,53,0.10), 0 2px 4px rgba(13,31,53,0.06)",
        "eup-lg": "0 12px 32px rgba(13,31,53,0.14), 0 4px 8px rgba(13,31,53,0.08)",
        "eup-xl": "0 24px 48px rgba(13,31,53,0.18)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
