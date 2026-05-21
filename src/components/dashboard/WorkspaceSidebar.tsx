import { NavLink, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  INTELLIGENCE_ITEMS,
  OPERATIONS_ITEMS,
  ACCOUNT_ITEMS,
  computeActiveTo,
  type WorkspaceItem,
} from "@/lib/workspaceNav";

function NavItem({ item, active }: { item: WorkspaceItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      title={item.label}
      className={cn(
        // At md (768px) the sidebar is icon-only; label appears at lg (1024px+).
        "inline-flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline justify-center lg:justify-start",
        active
          ? "bg-navy text-white"
          : "text-slate hover:bg-fog hover:text-navy",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="hidden lg:inline">{item.label}</span>
    </NavLink>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 px-3 mb-2 hidden lg:block">
      {children}
    </p>
  );
}

export default function WorkspaceSidebar() {
  const location = useLocation();

  const activeTo = useMemo(
    () => computeActiveTo(location.pathname, location.hash),
    [location.pathname, location.hash],
  );

  return (
    <aside
      aria-label="Workspace navigation"
      // Three-step width: hidden under md, icon-only 768–1023px, full 1024px+.
      className="hidden md:flex flex-col w-14 lg:w-[220px] shrink-0 border-r border-fog bg-card sticky top-14 md:top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto transition-[width] duration-200"
    >
      <div className="p-2 lg:p-3">
        <div className="mb-6">
          <GroupLabel>Intelligence</GroupLabel>
          <nav className="flex flex-col gap-0.5">
            {INTELLIGENCE_ITEMS.map((item) => (
              <NavItem key={item.to} item={item} active={activeTo === item.to} />
            ))}
          </nav>
        </div>

        <div className="mb-6">
          <GroupLabel>Operations</GroupLabel>
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
