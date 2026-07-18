import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Plus, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TOP_ITEMS,
  CATEGORY_GROUPS,
  BOTTOM_ITEMS,
  computeActiveTo,
  type WorkspaceItem,
  type WorkspaceCategory,
} from "@/lib/workspaceNav";
import { useClientStore, type Client } from "@/stores/clientStore";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const GROUP_STORAGE_PREFIX = "leftnav.group.";

function readGroupOpen(id: string): boolean {
  try {
    const v = localStorage.getItem(GROUP_STORAGE_PREFIX + id);
    if (v === null) return true; // first-time visitors: expanded
    return v === "1";
  } catch {
    return true;
  }
}

function writeGroupOpen(id: string, open: boolean) {
  try {
    localStorage.setItem(GROUP_STORAGE_PREFIX + id, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

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
 * A collapsible product category. Header does NOT navigate; clicking
 * toggles expansion. When collapsed, a product-count badge is shown.
 * Product clicks setActiveClient(workspace) then navigate to the route.
 */
function CategoryGroup({
  category,
  workspace,
  isActiveWorkspace,
  activeTo,
}: {
  category: WorkspaceCategory;
  workspace: Client;
  isActiveWorkspace: boolean;
  activeTo: string | null;
}) {
  const [open, setOpen] = useState<boolean>(() => readGroupOpen(category.id));
  const navigate = useNavigate();
  const setActiveClient = useClientStore((s) => s.setActiveClient);

  // If a product in this category becomes active, force-open the group so
  // the highlighted row is visible.
  const containsActive =
    isActiveWorkspace &&
    !!activeTo &&
    category.items.some((it) => it.to === activeTo);

  useEffect(() => {
    if (containsActive && !open) {
      setOpen(true);
      writeGroupOpen(category.id, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containsActive]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      writeGroupOpen(category.id, next);
      return next;
    });
  };

  const handleProductClick = (e: React.MouseEvent, to: string) => {
    e.preventDefault();
    setActiveClient(workspace);
    navigate(to);
  };

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={toggle}
        title={category.label}
        aria-expanded={open}
        className="w-full inline-flex items-center gap-2 px-2 lg:px-3 py-1.5 rounded-md text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500 hover:bg-brand-cloud/60 hover:text-brand-navy bg-transparent border-none cursor-pointer text-left"
      >
        <span className="hidden lg:inline shrink-0 text-brand-mist">
          {open ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
        <span className="hidden lg:inline flex-1 truncate">
          {category.label}
        </span>
        {!open && (
          <span className="hidden lg:inline shrink-0 rounded-full bg-brand-cloud text-brand-navy text-[10px] font-semibold px-1.5 py-0.5 leading-none">
            {category.items.length}
          </span>
        )}
      </button>

      {open && (
        <ul className="hidden lg:flex flex-col gap-0 mt-0.5 ml-3 pl-3 border-l border-brand-cloud">
          {category.items.map((item) => {
            const Icon = item.icon;
            const active = isActiveWorkspace && activeTo === item.to;
            return (
              <li key={item.to}>
                <a
                  href={item.to}
                  onClick={(e) => handleProductClick(e, item.to)}
                  className={cn(
                    "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors no-underline w-full",
                    active
                      ? "bg-brand-navy text-white font-medium"
                      : "text-slate hover:bg-brand-cloud hover:text-brand-navy",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    aria-hidden="true"
                  />
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

/**
 * One workspace section (Personal or a Client). Clicking the header
 * expands/collapses the whole workspace (which contains three category
 * groups).
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

  useEffect(() => {
    if (isActiveWorkspace) setOpen(true);
  }, [isActiveWorkspace]);

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
          {CATEGORY_GROUPS.map((cat) => (
            <CategoryGroup
              key={cat.id}
              category={cat}
              workspace={workspace}
              isActiveWorkspace={isActiveWorkspace}
              activeTo={activeTo}
            />
          ))}
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
    () => computeActiveTo(location.pathname, location.hash),
    [location.pathname, location.hash],
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

        {/* Bottom: Obligations, Account */}
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
