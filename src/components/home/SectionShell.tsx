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
    <section className={`rounded-xl border border-[hsl(var(--cobalt)/0.2)] bg-card overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-[hsl(var(--cobalt)/0.1)] flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--cobalt))] mb-1">
            {eyebrow}
          </p>
          <h2 className="font-display font-bold text-[16px] text-navy leading-snug">
            {headline}
          </h2>
          <p className="text-[11px] text-slate mt-0.5">{subline}</p>
        </div>
        {ctaLabel && ctaHref && (
          <Link
            to={ctaHref}
            className="flex-shrink-0 text-[10px] font-semibold text-[hsl(var(--cobalt))] border border-[hsl(var(--cobalt)/0.3)] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--cobalt)/0.05)] no-underline transition-colors whitespace-nowrap self-start mt-0.5"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}