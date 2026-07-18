// Persistent local navigation for the subscriber workspace (mobile).
// Lives at the top of every "my stuff" page.
//
// LEFTNAV-2: flat pills — top items, then Library items (Reports / Notices &
// RoPA / Filings / Obligations), then Clients, Account.
//
// Active-state rules are defined once in `@/lib/workspaceNav` and shared with
// the desktop `WorkspaceSidebar`, so both surfaces always highlight the same
// item for any given URL.

import { NavLink, useLocation } from "react-router-dom";
import { Settings, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  TOP_ITEMS,
  LIBRARY_ITEMS,
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

export default function DashboardSubnav() {
  const { user } = useAuth();
  const location = useLocation();

  const rawPath = location.pathname.toLowerCase();
  const activeTo = computeActiveTo(
    location.pathname,
    location.hash,
    location.search,
  );

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

  const accountActive = activeTo === "/account";
  const clientsActive = rawPath === "/clients" || rawPath.startsWith("/clients/");

  const renderPill = (
    to: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    active: boolean,
    key?: string,
  ) => (
    <li key={key ?? to} className="flex-shrink-0">
      <NavLink
        to={to}
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
        {label}
      </NavLink>
    </li>
  );

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-brand-cloud bg-card sticky top-14 md:top-16 z-30 backdrop-blur-sm bg-card/95"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
          <ul className="flex items-center gap-1 flex-nowrap">
            {TOP_ITEMS.map((item) =>
              renderPill(item.to, item.label, item.icon, activeTo === item.to),
            )}

            <li
              className="flex items-center gap-1 flex-shrink-0 pl-2 ml-1 border-l border-brand-cloud"
              key="library-group"
            >
              <span
                className="text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500 pr-1 whitespace-nowrap"
                aria-label="Library"
              >
                Library
              </span>
              <ul className="flex items-center gap-1 flex-nowrap">
                {LIBRARY_ITEMS.map((item) =>
                  renderPill(
                    item.to,
                    item.label,
                    item.icon,
                    activeTo === item.to,
                  ),
                )}
              </ul>
            </li>

            {renderPill("/clients", "Clients", Building2, clientsActive)}
          </ul>

          <NavLink
            to="/account"
            end
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors no-underline ml-auto",
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
