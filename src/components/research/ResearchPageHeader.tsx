import { Link } from "react-router-dom";
import { ExternalLink, ChevronRight } from "lucide-react";

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
  stats?: StatItem[];
  feedCategory?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function ResearchPageHeader({
  eyebrow,
  title,
  description,
  lastUpdated,
  stats,
  feedCategory,
  breadcrumbs,
}: ResearchPageHeaderProps) {
  const crumbs: BreadcrumbItem[] =
    breadcrumbs && breadcrumbs.length > 0
      ? breadcrumbs
      : [
          { label: "Home", href: "/" },
          { label: "Research", href: "/research" },
          { label: eyebrow },
        ];

  return (
    <div className="w-full" style={{ background: "hsl(var(--navy))", color: "white" }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: "hsl(var(--sky))" }}>
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={i} className="flex items-center gap-1.5">
                  {c.href && !isLast ? (
                    <Link to={c.href} className="hover:underline no-underline" style={{ color: "hsl(var(--sky))" }}>
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

        <p className="text-eyebrow mb-3" style={{ color: "hsl(var(--sky))" }}>
          {eyebrow}
        </p>


        <h1
          className="font-display text-white mb-4"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 400, lineHeight: 1.15 }}
        >
          {title}
        </h1>

        <p
          className="text-base mb-6"
          style={{ color: "hsl(var(--sky))", maxWidth: "680px", lineHeight: 1.65 }}
        >
          {description}
        </p>

        {stats && stats.length > 0 && (
          <div
            className="flex flex-wrap gap-6 mb-6 pt-4 border-t"
            style={{ borderColor: "hsl(var(--navy-light))" }}
          >
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-xl font-semibold text-white">{stat.value}</p>
                <p className="text-xs" style={{ color: "hsl(var(--slate-light))" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {feedCategory && (
            <Link
              to={`/updates?category=${feedCategory}`}
              className="flex items-center gap-1 text-xs font-semibold no-underline hover:underline"
              style={{ color: "hsl(var(--gold))" }}
            >
              Latest developments in feed <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
