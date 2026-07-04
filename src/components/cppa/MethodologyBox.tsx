// Compact bordered module for CPPA landing pages.
// Title + 3–5 short lines. No dates, no dynamic content.
import { ReactNode } from "react";

export interface MethodologyBoxProps {
  title: string;
  lines: ReactNode[];
  className?: string;
}

export default function MethodologyBox({ title, lines, className }: MethodologyBoxProps) {
  return (
    <aside
      className={`rounded-xl border border-brand-cloud bg-card px-5 py-4 md:px-6 md:py-5 ${className ?? ""}`}
    >
      <h3 className="font-display text-brand-navy text-base md:text-lg mb-3 leading-tight">
        {title}
      </h3>
      <ul className="space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="text-sm text-slate leading-6 flex gap-2">
            <span className="text-brand-teal font-bold shrink-0" aria-hidden>
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
