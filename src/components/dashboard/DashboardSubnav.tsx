// Persistent local navigation for the subscriber workspace.
// Lives at the top of every "my stuff" page (Brief, Reports, Filings, Watchlist).
// Each item is a real route change so browser back/forward works natively.

import { NavLink, useLocation } from "react-router-dom";
import { FileText, FolderOpen, FileCheck, Bookmark, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // Match function — some items match multiple paths (e.g. Reports matches its detail pages)
  match?: (pathname: string, hash: string) => boolean;
};

const ITEMS: Item[] = [
  {
    to: "/dashboard",
    label: "Brief",
    icon: FileText,
    match: (p) => p === "/dashboard" || p === "/dashboard/",
  },
  {
    to: "/dashboard/reports",
    label: "Reports",
    icon: FolderOpen,
    match: (p) =>
      p.startsWith("/dashboard/reports") ||
      // Tool result pages are conceptually part of "Reports"
      /^\/(li-assessment|dpia-framework|governance-assessment|dpa-generator|ir-playbook|biometric-checker)\/result\//.test(p),
  },
  {
    to: "/registration-manager/my-filings",
    label: "Filings",
    icon: FileCheck,
    match: (p) => p.startsWith("/registration-manager/my-filings") || p.startsWith("/registration-manager/order"),
  },
  {
    to: "/account#watchlist",
    label: "Watchlist",
    icon: Bookmark,
    match: (_p, h) => h === "#watchlist",
  },
];

export default function DashboardSubnav() {
  const location = useLocation();
  const pathname = location.pathname;
  const hash = location.hash;

  const isActive = (item: Item) => {
    if (item.match) return item.match(pathname, hash);
    return pathname === item.to;
  };

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-fog bg-card sticky top-0 z-30 backdrop-blur-sm bg-card/95"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          {/* Workspace tabs — horizontally scroll on small screens */}
          <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-1 px-1 py-2">
            {ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.to} className="flex-shrink-0">
                  <NavLink
                    to={item.to}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors no-underline whitespace-nowrap",
                      active
                        ? "bg-navy text-white"
                        : "text-slate hover:bg-fog hover:text-navy",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Account is settings, not workspace — separated on the right */}
          <NavLink
            to="/account"
            className={({ isActive: a }) =>
              cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors no-underline",
                a && !hash
                  ? "bg-fog text-navy"
                  : "text-slate hover:bg-fog hover:text-navy",
              )
            }
            end
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Account</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
