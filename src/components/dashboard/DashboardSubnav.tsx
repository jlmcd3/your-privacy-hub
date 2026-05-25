// Persistent local navigation for the subscriber workspace (mobile).
// Lives at the top of every "my stuff" page (Brief, Reports, Filings, Watchlist).
// Each item is a real route change so browser back/forward works natively.
//
// Active-state rules are defined once in `@/lib/workspaceNav` and shared with
// the desktop `WorkspaceSidebar`, so both surfaces always highlight the same
// item for any given URL. Account is shown as a separate trailing pill and
// highlights only when no workspace tab matched (computeActiveTo returns
// null) and the route is exactly /account.

import { NavLink, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  INTELLIGENCE_ITEMS,
  OPERATIONS_ITEMS,
  computeActiveTo,
} from "@/lib/workspaceNav";

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

// Workspace tab list = Intelligence + Operations groups from the shared
// definition. Account is rendered separately as the trailing pill below.
const ITEMS = [...INTELLIGENCE_ITEMS, ...OPERATIONS_ITEMS];

export default function DashboardSubnav() {
  const { user } = useAuth();
  const location = useLocation();

  const rawPath = location.pathname.toLowerCase();
  const activeTo = computeActiveTo(location.pathname, location.hash);

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

  // Account is its own trailing pill; highlight when the shared matcher
  // resolved the route to the Account item (covers /account and
  // /brief-preferences).
  const accountActive = activeTo === "/account";

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-brand-cloud bg-card sticky top-14 md:top-16 z-30 backdrop-blur-sm bg-card/95"
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
                        ? "bg-brand-navy text-white"
                        : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
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
                ? "bg-brand-cloud text-brand-navy"
                : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
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
