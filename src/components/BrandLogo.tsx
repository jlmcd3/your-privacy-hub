type LogoVariant = "light" | "dark" | "icon-light" | "icon-dark" | "icon-teal";

const LOGO_SRC: Record<LogoVariant, string> = {
  light: "/brand/logo-light.svg",
  dark: "/brand/logo-dark.svg",
  "icon-light": "/brand/icon-light.svg",
  "icon-dark": "/brand/icon-dark.svg",
  "icon-teal": "/brand/icon-teal.svg",
};

/**
 * EUP Brand Logo (v7). Renders one of the five canonical lockups from
 * `public/brand/`. Per the brand guidelines: never recolour, stretch, skew,
 * or rotate; enforce a minimum width of 120px for full lockups and 32px
 * for icon variants via CSS.
 */
export function BrandLogo({
  variant = "light",
  className,
  alt = "End User Privacy",
}: {
  variant?: LogoVariant;
  className?: string;
  alt?: string;
}) {
  return <img src={LOGO_SRC[variant]} alt={alt} className={className} />;
}

export default BrandLogo;
