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
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        navy: {
          DEFAULT: "hsl(var(--navy) / <alpha-value>)",
          mid: "hsl(var(--navy-mid) / <alpha-value>)",
          light: "hsl(var(--navy-light) / <alpha-value>)",
        },
        steel: "hsl(var(--steel) / <alpha-value>)",
        // Existing nested blue/slate kept so existing usages (bg-blue, text-slate-light) keep working.
        // Guide-recommended brand-blue aliases are added below for new code.
        blue: {
          DEFAULT: "hsl(var(--blue) / <alpha-value>)",
          light: "hsl(var(--blue-light) / <alpha-value>)",
        },
        "brand-blue": "hsl(var(--blue) / <alpha-value>)",
        "brand-blue-light": "hsl(var(--blue-light) / <alpha-value>)",
        sky: "hsl(var(--sky) / <alpha-value>)",
        slate: {
          DEFAULT: "hsl(var(--slate) / <alpha-value>)",
          light: "hsl(var(--slate-light) / <alpha-value>)",
        },
        "slate-light": "hsl(var(--slate-light) / <alpha-value>)",
        silver: "hsl(var(--silver) / <alpha-value>)",
        fog: "hsl(var(--fog) / <alpha-value>)",
        paper: "hsl(var(--paper) / <alpha-value>)",
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          light: "hsl(var(--accent-light) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        "accent-light": "hsl(var(--accent-light) / <alpha-value>)",
        cobalt: "hsl(var(--cobalt) / <alpha-value>)",
        warn: "hsl(var(--warn) / <alpha-value>)",
        gold: "hsl(var(--accent) / <alpha-value>)", // legacy alias — use accent in new code
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        // --- EUP Brand v7 palette (raw access utilities) ---
        brand: {
          navy: "hsl(var(--brand-navy) / <alpha-value>)",
          ocean: "hsl(var(--brand-ocean) / <alpha-value>)",
          "slate-teal": "hsl(var(--brand-slate-teal) / <alpha-value>)",
          teal: "hsl(var(--brand-teal) / <alpha-value>)",
          "teal-text": "hsl(var(--brand-teal-text) / <alpha-value>)",
          "teal-deep": "hsl(var(--brand-teal-deep) / <alpha-value>)",
          "teal-on-navy": "hsl(var(--brand-teal-on-navy) / <alpha-value>)",
          "light-teal": "hsl(var(--brand-light-teal) / <alpha-value>)",
          steel: "hsl(var(--brand-steel) / <alpha-value>)",
          mist: "hsl(var(--brand-mist) / <alpha-value>)",
          cloud: "hsl(var(--brand-cloud) / <alpha-value>)",
          shadow: "hsl(var(--brand-shadow) / <alpha-value>)",
        },
        severity: {
          critical: "hsl(var(--severity-critical) / <alpha-value>)",
          warning: "hsl(var(--severity-warning) / <alpha-value>)",
          success: "hsl(var(--severity-success) / <alpha-value>)",
          info: "hsl(var(--severity-info) / <alpha-value>)",
        },
        "teal-action": "hsl(var(--teal-action) / <alpha-value>)",
        "teal-wash": "hsl(var(--teal-wash) / <alpha-value>)",
        "teal-ink": "hsl(var(--teal-ink) / <alpha-value>)",
        paper: "hsl(var(--paper) / <alpha-value>)",
        rule: "hsl(var(--rule) / <alpha-value>)",
        "rule-strong": "hsl(var(--rule-strong) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        "ink-soft": "hsl(var(--ink-soft) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "'Times New Roman'", "serif"],
        serif: ["'DM Serif Display'", "Georgia", "'Times New Roman'", "serif"],
        "serif-text": ["'Source Serif 4'", "Georgia", "'Times New Roman'", "serif"],
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
      // Industry-standard Tailwind sizes expressed in rem so they respect
      // user zoom / OS font-size preferences. .text-body (16px) remains the
      // semantic body utility; text-base also = 16px.
      fontSize: {
        sm: ['0.875rem', { lineHeight: '1.55' }],
        base: ['1rem', { lineHeight: '1.65' }],
        // --- EUP Brand v7 type scale (Section 1.2) ---
        'display-hero': ['48px', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        'display-section': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-card': ['18px', { lineHeight: '1.3' }],
        'body-large': ['15px', { lineHeight: '1.55' }],
        'body-base': ['14px', { lineHeight: '1.55' }],
        'body-marketing': ['13px', { lineHeight: '1.55' }],
        'body-small': ['12px', { lineHeight: '1.45' }],
        'body-tiny': ['11px', { lineHeight: '1.4' }],
        'label-caps': ['10px', { lineHeight: '1.4', letterSpacing: '0.12em' }],
        // Fluid scale — smooth between min and max widths.
        'fluid-sm': ['clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)', { lineHeight: '1.55' }],
        'fluid-base': ['clamp(0.9375rem, 0.9rem + 0.2vw, 1.0625rem)', { lineHeight: '1.6' }],
        'fluid-lg': ['clamp(1rem, 0.95rem + 0.3vw, 1.1875rem)', { lineHeight: '1.5' }],
        'fluid-xl': ['clamp(1.125rem, 1.05rem + 0.45vw, 1.375rem)', { lineHeight: '1.4' }],
        'fluid-2xl': ['clamp(1.375rem, 1.25rem + 0.75vw, 1.875rem)', { lineHeight: '1.25' }],
        'fluid-hero': ['clamp(2rem, 1.4rem + 3vw, 3.5rem)', { lineHeight: '1.1' }],
      },
      spacing: {
        'fluid-sm': 'clamp(0.5rem, 0.4rem + 0.4vw, 0.75rem)',
        'fluid-md': 'clamp(0.75rem, 0.6rem + 0.6vw, 1.25rem)',
        'fluid-lg': 'clamp(1rem, 0.75rem + 1vw, 2rem)',
        'fluid-xl': 'clamp(1.5rem, 1rem + 2vw, 3rem)',
        'gutter': 'clamp(1rem, 0.5rem + 2vw, 2rem)',
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
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries"),
  ],
} satisfies Config;
