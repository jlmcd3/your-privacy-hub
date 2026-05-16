import { NavLink, useLocation } from "react-router-dom";
import { FileText, FolderOpen, FileCheck, Bookmark, Settings, Building2 } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
};

function normalize(p: string): string {
  const lower = p.toLowerCase();
  return lower.length > 1 && lower.endsWith("/") ? lower.slice(0, -1) : lower;
}

const REPORT_PATH = /^\/(li-assessment|dpia-framework|governance-assessment|dpa-generator|ir-playbook|biometric-checker)\/result(\/|$)/;
const FILING_PATH = /^\/registration-manager\/(my-filings|order|documents)(\/|$)/;

const INTELLIGENCE_ITEMS: Item[] = [
  {
    to: "/dashboard",
    label: "Intelligence Report",
    icon: FileText,
    match: (p) => p === "/dashboard",
  },
  {
    to: "/dashboard/reports",
    label: "My Reports",
    icon: FolderOpen,
    match: (p) =>
      p === "/dashboard/reports" ||
      p.startsWith("/dashboard/reports/") ||
      REPORT_PATH.test(p),
  },
  {
    to: "/watchlist",
    label: "Watchlist",
    icon: Bookmark,
    match: (p) => p === "/watchlist",
  },
];

const OPERATIONS_ITEMS: Item[] = [
  {
    to: "/registration-manager/my-filings",
    label: "Filings",
    icon: FileCheck,
    match: (p) => FILING_PATH.test(p),
  },
  {
    to: "/clients",
    label: "Clients",
    icon: Building2,
    match: (p) => p === "/clients" || p.startsWith("/clients/"),
  },
];

const ACCOUNT_ITEMS: Item[] = [
  {
    to: "/account",
    label: "Account",
    icon: Settings,
    match: (p) => p === "/account" || p === "/brief-preferences",
  },
];

const ALL_ITEMS = [...INTELLIGENCE_ITEMS, ...OPERATIONS_ITEMS, ...ACCOUNT_ITEMS];

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline",
        active
          ? "bg-navy text-white"
          : "text-slate hover:bg-fog hover:text-navy",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function WorkspaceSidebar() {
  const location = useLocation();
  const pathname = normalize(location.pathname);

  const activeTo = useMemo(() => {
    for (const item of ALL_ITEMS) {
      if (item.match(pathname)) return item.to;
    }
    return null;
  }, [pathname]);

  return (
    <aside
      aria-label="Workspace navigation"
      className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-fog bg-card sticky top-14 md:top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto"
    >
      <div className="p-3">
        <div className="mb-6">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 px-3 mb-2">
            Intelligence
          </p>
          <nav className="flex flex-col gap-0.5">
            {INTELLIGENCE_ITEMS.map((item) => (
              <NavItem key={item.to} item={item} active={activeTo === item.to} />
            ))}
          </nav>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 px-3 mb-2">
            Operations
          </p>
          <nav className="flex flex-col gap-0.5">
            {OPERATIONS_ITEMS.map((item) => (
              <NavItem key={item.to} item={item} active={activeTo === item.to} />
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-100 my-2" />

        <nav className="flex flex-col gap-0.5">
          {ACCOUNT_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} active={activeTo === item.to} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
