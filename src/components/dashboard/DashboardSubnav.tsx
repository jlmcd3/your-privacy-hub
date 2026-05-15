// Persistent local navigation for the subscriber workspace.
// Lives at the top of every "my stuff" page (Brief, Reports, Filings, Watchlist).
// Each item is a real route change so browser back/forward works natively.
//
// Active-state rules (designed to survive shared links and query/hash params):
//   - Pathname is normalized (trailing slash stripped, lower-cased) before matching.
//   - Hash is normalized (lower-cased) so `#Watchlist` and `#watchlist` both work.
//   - Query strings (`?foo=bar`) never affect matching — they're stripped by useLocation
//     pathname automatically, but we also tolerate hash-with-query like `#watchlist?x=1`.
//   - Items are evaluated in order; first match wins, so exactly one tab highlights.
//   - Account is the fallback: it highlights only when no workspace tab matched.

import { NavLink, useLocation } from "react-router-dom";
import { FileText, FolderOpen, FileCheck, Bookmark, Settings, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const SUPPRESS_PATHS = [
  '/',
  '/updates',
  '/enforcement',
  '/horizon',
  '/subscribe',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/check-email',
  '/onboarding-profile',
  '/about',
  '/contact',
  '/faq',
  '/terms',
  '/privacy-policy',
  '/get-intelligence',
  '/us-privacy-laws',
  '/gdpr-enforcement',
  '/global-privacy-laws',
  '/ai-privacy-regulations',
  '/jurisdictions',
  '/legislation-tracker',
  '/glossary',
  '/calendar',
  '/timelines',
  '/global-privacy-authorities',
  '/cross-border-transfers',
  '/biometric-privacy',
  '/health-data-privacy',
  '/cookie-consent',
  '/breach-notification',
  '/legitimate-interest-tracker',
];

const APPSHELL_PREFIXES = [
  '/dashboard',
  '/watchlist',
  '/clients',
  '/brief-preferences',
  '/account',
  '/ropa',
  '/us-notices',
  '/eu-notices',
  '/admin',
];

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string, hash: string) => boolean;
};

// Strip trailing slash (except root), lower-case for comparison.
function normalizePath(p: string): string {
  const lower = p.toLowerCase();
  if (lower.length > 1 && lower.endsWith("/")) return lower.slice(0, -1);
  return lower;
}

// Normalize hash: drop leading #, lower-case, and strip anything after `?` or `&`
// in case a shared link includes query-style params on the hash.
function normalizeHash(h: string): string {
  const stripped = h.replace(/^#/, "").toLowerCase();
  const cut = stripped.search(/[?&]/);
  return cut === -1 ? stripped : stripped.slice(0, cut);
}

// Tool result routes that conceptually belong under "Reports".
const REPORT_TOOL_PATH = /^\/(li-assessment|dpia-framework|governance-assessment|dpa-generator|ir-playbook|biometric-checker)\/result(\/|$)/;

// Filing/registration paths that belong under "Filings".
const FILING_PATH = /^\/registration-manager\/(my-filings|order|documents)(\/|$)/;

const ITEMS: Item[] = [
  {
    to: "/dashboard",
    label: "Intelligence Report",
    icon: FileText,
    // Exact /dashboard only — sub-routes like /dashboard/reports belong elsewhere.
    match: (p) => p === "/dashboard",
  },
  {
    to: "/dashboard/reports",
    label: "Reports",
    icon: FolderOpen,
    match: (p) =>
      p === "/dashboard/reports" ||
      p.startsWith("/dashboard/reports/") ||
      REPORT_TOOL_PATH.test(p),
  },
  {
    to: "/registration-manager/my-filings",
    label: "Filings",
    icon: FileCheck,
    match: (p) => FILING_PATH.test(p),
  },
  {
    to: "/watchlist",
    label: "Watchlist",
    icon: Bookmark,
    match: (p) => p === "/watchlist",
  },
  {
    to: "/clients",
    label: "Clients",
    icon: Building2,
    match: (p) => p === "/clients" || p.startsWith("/clients/"),
  },
];

export default function DashboardSubnav() {
  const { user } = useAuth();
  const location = useLocation();

  const rawPath = location.pathname.toLowerCase();
  const pathname = normalizePath(location.pathname);
  const hash = normalizeHash(location.hash);

  // First-match-wins so exactly one workspace tab can be active at a time.
  const activeTo = (() => {
    for (const item of ITEMS) {
      if (item.match(pathname, hash)) return item.to;
    }
    return null;
  })();

  if (!user) return null;

  const isSuppressed =
    SUPPRESS_PATHS.some(p => rawPath === p || rawPath.startsWith(p + '/')) ||
    rawPath.startsWith('/updates/') ||
    rawPath.startsWith('/jurisdiction/') ||
    rawPath.startsWith('/regulator/') ||
    rawPath.startsWith('/category/') ||
    rawPath.startsWith('/topics/') ||
    rawPath.startsWith('/glossary/') ||
    rawPath.startsWith('/timelines/') ||
    rawPath.startsWith('/compare/') ||
    rawPath.startsWith('/enforcement/') ||
    rawPath.startsWith('/subscribe/');
  if (isSuppressed) return null;

  // Account highlights only when no workspace tab claimed the route.
  const accountActive = activeTo === null && pathname === "/account";

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-fog bg-card sticky top-14 md:top-16 z-30 backdrop-blur-sm bg-card/95"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          {/* Workspace tabs — horizontally scroll on small screens */}
          <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-1 px-1 py-2">
            {ITEMS.map((item) => {
              const active = activeTo === item.to;
              const Icon = item.icon;
              return (
                <li key={item.to} className="flex-shrink-0">
                  <NavLink
                    to={item.to}
                    // Disable NavLink's built-in active detection — we own it via `activeTo`.
                    end
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors no-underline whitespace-nowrap",
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
            end
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors no-underline",
              accountActive
                ? "bg-fog text-navy"
                : "text-slate hover:bg-fog hover:text-navy",
            )}
            aria-current={accountActive ? "page" : undefined}
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Account</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
