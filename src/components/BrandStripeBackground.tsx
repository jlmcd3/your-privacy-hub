import type { ReactNode } from "react";

/**
 * EUP diagonal stripe background — secondary brand expression.
 *
 * Usage rules (brand guidelines §9):
 *   - Used only on the Privacy Intelligence Report masthead and the Tools
 *     catalog section header. NEVER on the homepage hero.
 *   - Full-bleed only — never cropped to a small area.
 *   - Direction is bottom-left to top-right — do not flip or rotate.
 *   - Always pair with white text and text-brand-light-teal for accent type.
 *   - Do not overlay heavy imagery on top.
 *
 * Hex values are intentionally inlined in the SVG fills — SVG attribute
 * values can reference CSS variables but the syntax is fragile across
 * browsers. If the palette changes, update this component.
 */
export function BrandStripeBackground({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 1440 600"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="1440" height="600" fill="#0d2a45" />
        <polygon points="0,600 600,0 720,0 120,600" fill="#1a4a6e" />
        <polygon points="120,600 720,0 840,0 240,600" fill="#1a4a6e" opacity="0.7" />
        <polygon points="240,600 840,0 960,0 360,600" fill="#2d7a8a" />
        <polygon points="360,600 960,0 1080,0 480,600" fill="#2d7a8a" opacity="0.7" />
        <polygon points="480,600 1080,0 1200,0 600,600" fill="#2a9d8f" />
        <polygon points="600,600 1200,0 1320,0 720,600" fill="#2a9d8f" opacity="0.7" />
        <polygon points="720,600 1320,0 1440,0 840,600" fill="#5dcaa5" opacity="0.4" />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default BrandStripeBackground;
