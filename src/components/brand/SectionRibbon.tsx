/**
 * UX-2d — Section Ribbon.
 *
 * Formalizes the deadline-alert pattern already used by
 * `CPPADeadlineStrip` (e.g. "CPPA's Audits Division is active" band). A
 * reusable navy strip with a leading eyebrow phrase, a chip list of
 * items (label + date/value), and an optional CTA on the right.
 *
 * Not wired into `CPPADeadlineStrip` directly to preserve the strip's
 * session-dismiss module state, but every future ribbon should render
 * through this component.
 */
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface SectionRibbonItem {
  label: string;
  value: string;
}

export interface SectionRibbonProps {
  eyebrow: string;
  items?: SectionRibbonItem[];
  cta?: { label: string; href: string };
  tone?: "navy" | "ocean" | "teal";
  className?: string;
}

const TONE: Record<NonNullable<SectionRibbonProps["tone"]>, string> = {
  navy: "bg-brand-navy text-white border-white/10",
  ocean: "bg-brand-ocean text-white border-white/10",
  teal: "bg-brand-teal-deep text-white border-white/10",
};

export function SectionRibbon({
  eyebrow,
  items = [],
  cta,
  tone = "navy",
  className,
}: SectionRibbonProps) {
  return (
    <div className={cn("border-b", TONE[tone], className)}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
        <p className="font-semibold whitespace-nowrap">{eyebrow}</p>
        {items.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 flex-1 min-w-0 list-none p-0 m-0">
            {items.map((it) => (
              <li
                key={`${it.label}:${it.value}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs whitespace-nowrap"
              >
                <span className="text-white/80">{it.label}</span>
                <span className="font-semibold text-white">— {it.value}</span>
              </li>
            ))}
          </ul>
        )}
        {cta && (
          <Link
            to={cta.href}
            className="text-brand-teal-on-navy hover:text-white font-semibold whitespace-nowrap no-underline md:ml-auto"
          >
            {cta.label} →
          </Link>
        )}
      </div>
    </div>
  );
}

export default SectionRibbon;
