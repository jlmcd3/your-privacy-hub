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

        <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
          {eyebrow}
        </span>

        <h1 className="font-serif text-white mb-3">{title}</h1>

        <p className="text-slate-300 text-lg max-w-3xl mb-6 leading-relaxed">
          {description}
        </p>

      </div>
    </header>
  );
}
