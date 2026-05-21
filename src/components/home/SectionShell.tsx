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
    <section className={`@container rounded-xl border border-[hsl(var(--cobalt)/0.2)] bg-card overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-[hsl(var(--cobalt)/0.1)] flex flex-col gap-3 @[480px]:flex-row @[480px]:items-start @[480px]:justify-between @[480px]:gap-4">
        <div className="min-w-0">
          <p className="text-eyebrow !text-sm text-[hsl(var(--cobalt))] mb-1">
            {eyebrow}
          </p>
          <h2 className="text-section-h2 text-navy">
            {headline}
          </h2>
          <p className="text-base text-slate mt-0.5">{subline}</p>
        </div>
        {ctaLabel && ctaHref && (
          <Link
            to={ctaHref}
            className="flex-shrink-0 text-cta text-[hsl(var(--cobalt))] border border-[hsl(var(--cobalt)/0.3)] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--cobalt)/0.05)] no-underline transition-colors whitespace-nowrap self-start @[480px]:mt-0.5"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}