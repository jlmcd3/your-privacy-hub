// PRE-INTAKE REDESIGN (2026-08-26) — shared CPPA suite selector.
// Slim module tab strip rendered immediately above the hero on all three
// CPPA product pages, so cross-sell is structural rather than a late
// interruption (replaces the ADMT-only cross-sell box below the masthead).
import { Link } from "react-router-dom";

export type SuiteModuleKey = "m1" | "m2" | "m3";

const MODULES: { key: SuiteModuleKey; label: string; to: string }[] = [
  { key: "m1", label: "M1 Risk", to: "/cppa-risk-assessment" },
  { key: "m2", label: "M2 Cybersecurity", to: "/cppa-cybersecurity" },
  { key: "m3", label: "M3 ADMT", to: "/cppa-admt-checker" },
];

export default function SuiteSelector({ active }: { active: SuiteModuleKey }) {
  return (
    <nav
      aria-label="CPPA Audit Readiness Suite modules"
      className="border-b border-border bg-muted/40"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mr-2 shrink-0 py-2">
          CPPA Audit Readiness Suite
        </span>
        {MODULES.map((m) =>
          m.key === active ? (
            <span
              key={m.key}
              aria-current="page"
              className="shrink-0 px-3 py-2 text-sm font-semibold text-brand-navy border-b-2 border-brand-navy -mb-px"
            >
              {m.label}
            </span>
          ) : (
            <Link
              key={m.key}
              to={m.to}
              className="shrink-0 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-brand-navy border-b-2 border-transparent -mb-px no-underline transition-colors"
            >
              {m.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
