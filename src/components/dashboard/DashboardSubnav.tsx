// Persistent local navigation for the subscriber workspace.
// UX-1c: single 40px bar, no horizontal scrollbar. A subset of high-priority
// items is visible; every other workspace destination lives behind "More ▾".

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Settings, Building2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  TOP_ITEMS,
  START_NEW_ITEM,
  WORKSPACE_GROUPS,
  STANDALONE_ITEMS,
  computeActiveTo,
} from "@/lib/workspaceNav";

const SUPPRESS_PATHS = [
  '/', '/updates', '/enforcement', '/horizon', '/subscribe', '/login',
  '/signup', '/forgot-password', '/reset-password', '/check-email',
  '/onboarding-profile', '/about', '/contact', '/faq', '/terms',
  '/privacy-policy', '/get-intelligence', '/us-privacy-laws',
  '/gdpr-enforcement', '/global-privacy-laws', '/ai-privacy-regulations',
  '/jurisdictions', '/legislation-tracker', '/glossary', '/calendar',
  '/timelines', '/global-privacy-authorities', '/cross-border-transfers',
  '/biometric-privacy', '/health-data-privacy', '/cookie-consent',
  '/breach-notification', '/legitimate-interest-tracker', '/pricing',
];

type LeafItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

export default function DashboardSubnav() {
  const { user } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const rawPath = location.pathname.toLowerCase();
  const activeTo = computeActiveTo(location.pathname, location.hash, location.search);

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

  // Primary bar: Top items + Start New. Everything else -> "More ▾".
  const primary: LeafItem[] = [
    ...TOP_ITEMS,
    { to: START_NEW_ITEM.to, label: START_NEW_ITEM.label, icon: START_NEW_ITEM.icon },
  ];

  const overflow: { header?: string; items: LeafItem[] }[] = [
    ...WORKSPACE_GROUPS.map(g => ({
      header: g.label,
      items: g.items.map(i => ({ to: i.to, label: i.label, icon: i.icon })),
    })),
    { header: "Standalones", items: STANDALONE_ITEMS.map(i => ({ to: i.to, label: i.label, icon: i.icon })) },
    { header: "Workspace", items: [{ to: "/clients", label: "Clients", icon: Building2 }] },
  ];

  const renderPill = (
    to: string, label: string,
    Icon: React.ComponentType<{ className?: string }>,
    active: boolean, key?: string,
  ) => (
    <li key={key ?? to} className="flex-shrink-0">
      <NavLink
        to={to}
        end
        title={label}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-sm font-medium transition-colors no-underline whitespace-nowrap",
          active ? "bg-brand-navy text-white" : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        {label}
      </NavLink>
    </li>
  );

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-brand-cloud bg-card sticky top-14 z-30 backdrop-blur-sm bg-card/95"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 h-10">
          <ul className="flex items-center gap-1 flex-nowrap min-w-0 overflow-hidden">
            {primary.map(item => renderPill(item.to, item.label, item.icon, activeTo === item.to))}
          </ul>

          <div ref={moreRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-sm font-medium transition-colors bg-transparent border-none cursor-pointer",
                moreOpen ? "bg-brand-cloud text-brand-navy" : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
              )}
            >
              <MoreHorizontal className="w-4 h-4" aria-hidden="true" strokeWidth={1.75} />
              More
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 min-w-[260px] max-h-[70vh] overflow-y-auto bg-card border border-brand-cloud rounded-xl shadow-eup-md py-2 z-40"
              >
                {overflow.map((grp, gi) => (
                  <div key={gi} className={cn(gi > 0 && "border-t border-brand-cloud mt-1 pt-1")}>
                    {grp.header && (
                      <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500">
                        {grp.header}
                      </div>
                    )}
                    {grp.items.map(sub => {
                      const Icon = sub.icon;
                      const active = activeTo === sub.to || (sub.to === "/clients" && clientsActive);
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          end
                          role="menuitem"
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-sm no-underline",
                            active ? "bg-brand-cloud text-brand-navy font-medium" : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
                          )}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                          {sub.label}
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <NavLink
            to="/account"
            end
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-sm font-medium transition-colors no-underline ml-auto",
              accountActive ? "bg-brand-cloud text-brand-navy" : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
            )}
            aria-current={accountActive ? "page" : undefined}
          >
            <Settings className="w-4 h-4" aria-hidden="true" strokeWidth={1.75} />
            <span className="hidden sm:inline">Account</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
