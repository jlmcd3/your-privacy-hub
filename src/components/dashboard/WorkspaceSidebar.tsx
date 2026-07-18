import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Plus, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TOP_ITEMS,
  LIBRARY_ITEMS,
  REPORTS_ITEM,
  REPORTS_SUBITEMS,
  BOTTOM_ITEMS,
  computeActiveTo,
  computeActiveReportsSub,
  type WorkspaceItem,
} from "@/lib/workspaceNav";
import { useClientStore, type Client } from "@/stores/clientStore";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/** Top-level item — full-width link. */
function NavItem({ item, active }: { item: WorkspaceItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      title={item.label}
      className={cn(
        "inline-flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline justify-center lg:justify-start",
        active
          ? "bg-brand-navy text-white"
          : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="hidden lg:inline">{item.label}</span>
    </NavLink>
  );
}

/**
 * Library-section product row. Clicking calls setActiveClient(workspace)
 * before navigating so the correct workspace context is applied.
 */
function LibraryRow({
  item,
  workspace,
  active,
}: {
  item: WorkspaceItem;
  workspace: Client;
  active: boolean;
}) {
  const navigate = useNavigate();
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveClient(workspace);
    navigate(item.to);
  };

  return (
    <li>
      <a
        href={item.to}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors no-underline w-full",
          active
            ? "bg-brand-navy text-white font-medium"
            : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{item.label}</span>
      </a>
    </li>
  );
}

/** Reports sub-item (filtered view) — indented under Reports. */
function ReportsSubRow({
  to,
  label,
  workspace,
  active,
}: {
  to: string;
  label: string;
  workspace: Client;
  active: boolean;
}) {
  const navigate = useNavigate();
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveClient(workspace);
    navigate(to);
  };
  return (
    <li>
      <a
        href={to}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-2 pl-6 pr-2 py-1 rounded-md text-[13px] transition-colors no-underline w-full",
          active
            ? "text-brand-navy font-medium bg-brand-cloud/60"
            : "text-slate-500 hover:bg-brand-cloud hover:text-brand-navy",
        )}
        aria-current={active ? "page" : undefined}
      >
        <span className="text-brand-mist">·</span>
        <span>{label}</span>
      </a>
    </li>
  );
}

/**
 * One workspace section (Personal or a Client). Clicking the header
 * expands/collapses the whole workspace which contains the LIBRARY items.
 */
function WorkspaceSection({
  workspace,
  isActiveWorkspace,
  activeTo,
  activeReportsSub,
  defaultOpen,
  icon: HeaderIcon,
}: {
  workspace: Client;
  isActiveWorkspace: boolean;
  activeTo: string | null;
  activeReportsSub: ReturnType<typeof computeActiveReportsSub>;
  defaultOpen: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (isActiveWorkspace) setOpen(true);
  }, [isActiveWorkspace]);

  const isReportsActive =
    isActiveWorkspace && activeTo === REPORTS_ITEM.to;

  return (
    <div
      className={cn(
        "mb-1",
        isActiveWorkspace && "border-l-2 border-[#2563EB] pl-0.5",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={workspace.name}
        aria-expanded={open}
        className={cn(
          "w-full inline-flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-transparent border-none cursor-pointer text-left justify-center lg:justify-start",
          isActiveWorkspace
            ? "text-brand-teal-text"
            : "text-brand-navy hover:bg-brand-cloud",
        )}
      >
        <HeaderIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="hidden lg:inline flex-1 truncate">
          {workspace.name}
        </span>
        <span className="hidden lg:inline shrink-0 text-brand-mist">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {open && (
        <div className="hidden lg:block mt-1 ml-2 pl-2 border-l border-brand-cloud/60">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500">
            Library
          </div>
          <ul className="flex flex-col gap-0 mt-0.5">
            {LIBRARY_ITEMS.map((item) => (
              <>
                <LibraryRow
                  key={item.to}
                  item={item}
                  workspace={workspace}
                  active={isActiveWorkspace && activeTo === item.to}
                />
                {item.to === REPORTS_ITEM.to && isReportsActive && (
                  <ul
                    key={`${item.to}-subs`}
                    className="flex flex-col gap-0 ml-3 pl-3 border-l border-brand-cloud"
                  >
                    {REPORTS_SUBITEMS.map((s) => (
                      <ReportsSubRow
                        key={s.to}
                        to={s.to}
                        label={s.label}
                        workspace={workspace}
                        active={activeReportsSub === s.id}
                      />
                    ))}
                  </ul>
                )}
              </>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function WorkspaceSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium, isLoading } = useSubscriptionTier();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const clients = useClientStore((s) => s.clients);
  const personal = useClientStore((s) => s.personal);
  const activeClient = useClientStore((s) => s.activeClient);
  const loadClients = useClientStore((s) => s.loadClients);

  useEffect(() => {
    if (user && !personal && clients.length === 0) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const activeTo = useMemo(
    () =>
      computeActiveTo(location.pathname, location.hash, location.search),
    [location.pathname, location.hash, location.search],
  );

  const activeReportsSub = useMemo(
    () => computeActiveReportsSub(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const isPersonalActive = !!personal && activeClient?.id === personal.id;

  if (!user || isLoading || adminLoading || (!isPremium && !isAdmin))
    return null;

  return (
    <aside
      aria-label="Workspace navigation"
      className="hidden md:flex flex-col w-14 lg:w-[240px] shrink-0 border-r border-brand-cloud bg-card sticky top-14 md:top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto transition-[width] duration-200"
    >
      <div className="p-2 lg:p-3">
        {/* Top items: Weekly Briefs, Watchlist, Start New… */}
        <nav className="flex flex-col gap-0.5 mb-4">
          {TOP_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              active={activeTo === item.to}
            />
          ))}
        </nav>

        <div className="border-t border-brand-cloud/40 my-3" />

        {/* Personal workspace */}
        {personal && (
          <div className="mb-4">
            <WorkspaceSection
              workspace={personal}
              isActiveWorkspace={isPersonalActive}
              activeTo={activeTo}
              activeReportsSub={activeReportsSub}
              defaultOpen={isPersonalActive}
              icon={User}
            />
          </div>
        )}

        {/* Clients */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-slate-400/70 pb-1 border-b border-brand-cloud/60 hidden lg:block">
              Clients
            </p>
            <NavLink
              to="/clients"
              title="Manage clients"
              className="hidden lg:inline-flex items-center text-brand-mist hover:text-brand-navy no-underline -mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
            </NavLink>
          </div>
          {clients.length === 0 ? (
            <NavLink
              to="/clients"
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 text-xs text-slate hover:text-brand-navy no-underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add a client
            </NavLink>
          ) : (
            <div className="flex flex-col">
              {clients.map((c) => (
                <WorkspaceSection
                  key={c.id}
                  workspace={c}
                  isActiveWorkspace={activeClient?.id === c.id}
                  activeTo={activeTo}
                  activeReportsSub={activeReportsSub}
                  defaultOpen={activeClient?.id === c.id}
                  icon={Building2}
                />
              ))}
              <NavLink
                to="/clients"
                className="hidden lg:inline-flex items-center px-3 py-1.5 mt-1 text-[11px] text-slate-400 hover:text-brand-navy no-underline"
              >
                Manage clients →
              </NavLink>
            </div>
          )}
        </div>

        <div className="border-t border-brand-cloud/40 my-3" />

        {/* Bottom: Account */}
        <nav className="flex flex-col gap-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              active={activeTo === item.to}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
