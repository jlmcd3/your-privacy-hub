import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface SectionShellProps {
  eyebrow: string;
  headline: string;
  subline: string;
  ctaLabel?: string;
  ctaHref?: string;
  children: ReactNode;
  className?: string;
}

export default function SectionShell({
  eyebrow,
  headline,
  subline,
  ctaLabel,
  ctaHref,
  children,
  className = "",
}: SectionShellProps) {
  return (
    <section className={`py-14 md:py-16 ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8">
          <div className="max-w-2xl">
            <p className="text-eyebrow text-[hsl(var(--cobalt))] mb-2">{eyebrow}</p>
            <h2 className="font-display text-[28px] md:text-[32px] text-navy leading-tight mb-2">
              {headline}
            </h2>
            <p className="text-[15px] text-slate leading-relaxed">{subline}</p>
          </div>
          {ctaLabel && ctaHref && (
            <Link
              to={ctaHref}
              className="text-[14px] font-semibold text-[hsl(var(--cobalt))] hover:underline no-underline whitespace-nowrap"
            >
              {ctaLabel}
            </Link>
          )}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
