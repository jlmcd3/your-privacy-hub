import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Plus, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTELLIGENCE_ITEMS,
  WORK_ITEMS,
  ACCOUNT_ITEMS,
  computeActiveTo,
  type WorkspaceItem,
} from "@/lib/workspaceNav";
import { useClientStore, type Client } from "@/stores/clientStore";
import { useAuth } from "@/hooks/useAuth";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-slate-400/70 px-3 pb-1 mb-2 border-b border-brand-cloud/60 hidden lg:block">
      {children}
    </p>
  );
}

/** Top-level item (Intelligence + Account) — full-width link. */
function NavItem({ item, active }: { item: WorkspaceItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      title={item.label}
      className={cn(
        "inline-flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline justify-center lg:justify-start",
        active ? "bg-brand-navy text-white" : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="hidden lg:inline">{item.label}</span>
    </NavLink>
  );
}

/**
 * One workspace section (Personal or a Client). Clicking the header expands
 * the work items. Clicking any work item switches the active workspace to
 * this one AND navigates to the route — guaranteeing the page never opens
 * against a stale client context.
 */
function WorkspaceSection({
  workspace,
  isActiveWorkspace,
  activeTo,
  defaultOpen,
  icon: HeaderIcon,
}: {
  workspace: Client;
  isActiveWorkspace: boolean;
  activeTo: string | null;
  defaultOpen: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();
  const setActiveClient = useClientStore((s) => s.setActiveClient);

  // Re-open the section when this workspace becomes active (e.g., user picked
  // it from the topbar switcher) so its work items are visible.
  useEffect(() => {
    if (isActiveWorkspace) setOpen(true);
  }, [isActiveWorkspace]);

  const handleWorkClick = (e: React.MouseEvent, to: string) => {
    e.preventDefault();
    setActiveClient(workspace);
    navigate(to);
  };

  return (
    <div className={cn("mb-1", isActiveWorkspace && "border-l-2 border-[#2563EB] pl-1")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={workspace.name}
        className={cn(
          "w-full inline-flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-transparent border-none cursor-pointer text-left justify-center lg:justify-start",
          isActiveWorkspace
            ? "text-brand-teal"
            : "text-brand-navy hover:bg-brand-cloud",
        )}
        aria-expanded={open}
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
        <ul className="hidden lg:flex flex-col gap-0 mt-0.5 ml-2 pl-3 border-l border-brand-cloud">
          {WORK_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActiveWorkspace && activeTo === item.to;
            return (
              <li key={item.to}>
                <a
                  href={item.to}
                  onClick={(e) => handleWorkClick(e, item.to)}
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
          })}
        </ul>
      )}
    </div>
  );
}

export default function WorkspaceSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const clients = useClientStore((s) => s.clients);
  const personal = useClientStore((s) => s.personal);
  const activeClient = useClientStore((s) => s.activeClient);
  const loadClients = useClientStore((s) => s.loadClients);

  useEffect(() => {
    if (user && !personal && clients.length === 0) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const activeTo = useMemo(
    () => computeActiveTo(location.pathname, location.hash),
    [location.pathname, location.hash],
  );

  const isPersonalActive = !!personal && activeClient?.id === personal.id;

  return (
    <aside
      aria-label="Workspace navigation"
      className="hidden md:flex flex-col w-14 lg:w-[240px] shrink-0 border-r border-brand-cloud bg-card sticky top-14 md:top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto transition-[width] duration-200"
    >
      <div className="p-2 lg:p-3">
        {/* Intelligence — always personal */}
        <div className="mb-6">
          <GroupLabel>Intelligence</GroupLabel>
          <nav className="flex flex-col gap-0.5">
            {INTELLIGENCE_ITEMS.map((item) => (
              <NavItem key={item.to} item={item} active={activeTo === item.to} />
            ))}
          </nav>
        </div>

        {/* Personal workspace */}
        {personal && (
          <div className="mb-4">
            <GroupLabel>Personal Workspace</GroupLabel>
            <WorkspaceSection
              workspace={personal}
              isActiveWorkspace={isPersonalActive}
              activeTo={activeTo}
              defaultOpen={isPersonalActive}
              icon={User}
            />
          </div>
        )}

        {/* Clients */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <GroupLabel>Clients</GroupLabel>
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
                  defaultOpen={activeClient?.id === c.id}
                  icon={Building2}
                />
              ))}
              <NavLink
                to="/clients"
                className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 mt-1 text-xs text-slate hover:text-brand-navy no-underline"
              >
                <Plus className="w-3 h-3" />
                Manage clients
              </NavLink>
            </div>
          )}
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
