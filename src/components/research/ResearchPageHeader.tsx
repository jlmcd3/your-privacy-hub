import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface StatItem {
  value: string;
  label: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ResearchPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated?: string;
  contextUpdated?: string;
  stats?: StatItem[];
  feedCategory?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** UX-2c — mono statute citation rendered directly under the H1 in the masthead band. */
  statuteCite?: string;
}

function formatContextDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ResearchPageHeader({
  eyebrow,
  title,
  description,
  lastUpdated,
  contextUpdated,
  stats,
  feedCategory,
  breadcrumbs,
  statuteCite,
}: ResearchPageHeaderProps) {
  const contextUpdatedLabel = formatContextDate(contextUpdated);
  const crumbs: BreadcrumbItem[] =
    breadcrumbs && breadcrumbs.length > 0
      ? breadcrumbs
      : [
          { label: "Home", href: "/" },
          { label: eyebrow },
        ];

  return (
    <header className="w-full bg-slate-900 text-white py-12">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={i} className="flex items-center gap-1.5">
                  {c.href && !isLast ? (
                    <Link to={c.href} className="hover:underline no-underline text-slate-400 hover:text-slate-200">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-white" : ""}>
                      {c.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 opacity-60" />}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-start">
          <div>
            <h1 className="text-hero-h1 text-white mb-2">{title}</h1>

            {statuteCite && (
              <p className="font-mono text-[12.5px] leading-snug text-slate-400 mb-3">
                {statuteCite}
              </p>
            )}

            <p className="text-slate-300 text-lg max-w-3xl mb-4 leading-relaxed">
              {description}
            </p>

            {stats && stats.length > 0 && (
              <div className="flex lg:hidden flex-wrap gap-x-8 gap-y-3 mt-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-serif text-[28px] leading-none text-white">{s.value}</div>
                    <div className="text-[10px] tracking-[0.12em] uppercase text-slate-400 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

          </div>

          {stats && stats.length > 0 && (
            <div className="hidden lg:flex flex-col divide-y divide-white/15 border-y border-white/15 min-w-[180px]">
              {stats.map((s) => (
                <div key={s.label} className="py-3">
                  <div className="font-serif text-[28px] leading-none text-white">{s.value}</div>
                  <div className="text-[10px] tracking-[0.12em] uppercase text-slate-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
