// PRE-INTAKE REDESIGN (2026-08-26) — compact "How it works" row.
// Replaces the full-width MethodologyBox in the pre-intake stack with a
// three-item strip after the sales cards. The analytical-aid/legal
// qualification moves to the Legal notes disclosure (CompactDisclaimer).
import type { ReactNode } from "react";

export default function HowItWorksRow({
  items,
  heading = "How it works",
  className = "",
}: {
  items: ReactNode[];
  heading?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="rounded-xl border border-brand-cloud bg-muted/40 px-5 py-4">
        <h2 className="text-sm font-semibold text-brand-navy uppercase tracking-[0.08em] mb-3">
          {heading}
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span
                aria-hidden
                className="shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-white text-[11px] font-semibold"
              >
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
