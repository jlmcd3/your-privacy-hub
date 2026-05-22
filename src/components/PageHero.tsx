import type { ReactNode } from "react";

interface PageHeroProps {
  /** Optional chip / eyebrow label shown above the title (e.g. "⚖️ Assessment"). */
  chip?: ReactNode;
  /** Main page title — rendered as <h1> in serif. */
  title: ReactNode;
  /** Short product description. */
  description?: ReactNode;
  /** Optional secondary line under the description. */
  meta?: ReactNode;
  /** Optional CTA / actions row. */
  children?: ReactNode;
  /** Container width — defaults to the site-wide 1280px to align with navbar/footer. */
  maxWidth?: "4xl" | "5xl" | "6xl" | "1280";
  className?: string;
}

const WIDTHS: Record<NonNullable<PageHeroProps["maxWidth"]>, string> = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "1280": "max-w-[1280px]",
};

/**
 * Standard page hero used across Intelligence, Compliance Tools, and Research
 * pages. Provides a consistent slate-900 backdrop with serif heading, amber
 * accent chip, and muted description copy.
 */
export function PageHero({
  chip,
  title,
  description,
  meta,
  children,
  maxWidth = "1280",
  className = "",
}: PageHeroProps) {
  return (
    <header className={`bg-slate-900 text-white py-12 ${className}`}>
      <div className={`${WIDTHS[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8`}>
        {chip ? (
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            {chip}
          </span>
        ) : null}
        <h1 className="font-serif mb-3 text-white">{title}</h1>
        {description ? (
          <p className="text-slate-300 text-lg max-w-3xl">{description}</p>
        ) : null}
        {meta ? (
          <div className="text-slate-400 text-sm mt-3 max-w-3xl">{meta}</div>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </header>
  );
}

export default PageHero;
