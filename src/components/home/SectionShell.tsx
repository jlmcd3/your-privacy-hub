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
    <div
      className={`rounded-xl border border-[#2563EB]/20 bg-white overflow-hidden ${className}`}
    >
      <div className="px-5 py-4 border-b border-[#2563EB]/10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
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
            className="flex-shrink-0 text-[10px] font-semibold text-[#2563EB] border border-[#2563EB]/30 px-3 py-1.5 rounded-lg hover:bg-[#2563EB]/5 no-underline transition-colors whitespace-nowrap self-start mt-0.5"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
