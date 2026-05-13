import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Globe,
  FileText,
  Rss,
  FolderOpen,
  Bookmark,
  FileCheck,
  Building2,
  LayoutGrid,
  SlidersHorizontal,
  Settings,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import AdminOnly from "@/components/AdminOnly";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { supabase } from "@/integrations/supabase/client";

interface AppShellContextValue {
  setTitle: (t: string) => void;
  setSubtitle: (s: string) => void;
}

export const AppShellContext = React.createContext<AppShellContextValue>({
  setTitle: () => {},
  setSubtitle: () => {},
});

export const useAppShell = () => React.useContext(AppShellContext);

const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Privacy Intelligence Report" },
  "/dashboard/reports": { title: "My Reports" },
  "/watchlist": { title: "Watchlist" },
  "/clients": { title: "Clients Portfolio" },
  "/registration-manager/my-filings": { title: "My Filings" },
  "/brief-preferences": { title: "Brief Preferences" },
  "/account": { title: "Account Settings" },
};

const TOOL_RESULT_RX =
  /^\/(li-assessment|dpia-framework|governance-assessment|dpa-generator|ir-playbook|biometric-checker|cppa-risk-assessment|cppa-cybersecurity|cppa-suite)\/result/;

const FILINGS_RX =
  /^\/(registration-manager\/(my-filings|order|documents)|ropa|us-notices|eu-notices)/;

interface NavItemDef {
  label: string;
  href: string;
  icon: React.ElementType;
}

const INTELLIGENCE: NavItemDef[] = [
  { label: "Intelligence Report", href: "/dashboard", icon: FileText },
  { label: "Privacy Intelligence Feed", href: "/updates", icon: Rss },
];

const WORKSPACE: NavItemDef[] = [
  { label: "Reports", href: "/dashboard/reports", icon: FolderOpen },
  { label: "Watchlist", href: "/watchlist", icon: Bookmark },
  { label: "Filings", href: "/registration-manager/my-filings", icon: FileCheck },
  { label: "Clients", href: "/clients", icon: Building2 },
];

const TOOLS: NavItemDef[] = [
  { label: "All Tools", href: "/tools", icon: LayoutGrid },
];

const ACCOUNT: NavItemDef[] = [
  { label: "Brief Preferences", href: "/brief-preferences", icon: SlidersHorizontal },
  { label: "Settings", href: "/account", icon: Settings },
];

const ADMIN: NavItemDef[] = [
  { label: "Test Suite", href: "/admin/test-governance", icon: Shield },
  { label: "Ingestion", href: "/admin/ingestion", icon: Shield },
  { label: "Articles", href: "/admin/articles", icon: Shield },
  { label: "Email Signups", href: "/admin/email-signups", icon: Shield },
  { label: "Gating Leaks", href: "/admin/gating-leaks", icon: Shield },
  { label: "Brief Gen Status", href: "/admin/briefgen-status", icon: Shield },
  { label: "Pricing", href: "/admin/pricing", icon: Shield },
  { label: "Law Updates", href: "/admin/law-updates", icon: Shield },
];

function isItemActive(item: NavItemDef, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (item.href === "/dashboard/reports" && TOOL_RESULT_RX.test(pathname)) return true;
  if (item.href === "/registration-manager/my-filings" && FILINGS_RX.test(pathname)) return true;
  if (item.href === "/admin/test-governance" && pathname.startsWith("/admin/test-")) return true;
  return false;
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItemDef[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const active = isItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={active}>
                <Link to={item.href}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useSubscriptionTier();
  const contentRef = useRef<HTMLElement>(null);

  const routeMeta = ROUTE_TITLES[location.pathname];
  const [title, setTitle] = useState(routeMeta?.title ?? "");
  const [subtitle, setSubtitle] = useState(routeMeta?.subtitle ?? "");

  useEffect(() => {
    const meta = ROUTE_TITLES[location.pathname];
    setTitle(meta?.title ?? "");
    setSubtitle(meta?.subtitle ?? "");
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  const tierBadge =
    tier === "annual" || tier === "annual_founding" ? (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
        Platform
      </span>
    ) : tier === "monthly" ? (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300">
        Intelligence
      </span>
    ) : null;

  return (
    <AppShellContext.Provider value={{ setTitle, setSubtitle }}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar className="w-[220px]">
            <SidebarHeader>
              <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5 no-underline">
                <span className="bg-gold w-7 h-7 rounded-md flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </span>
                <span className="font-semibold text-navy text-sm">End User Privacy</span>
              </Link>
            </SidebarHeader>

            <SidebarContent>
              <NavSection label="Intelligence" items={INTELLIGENCE} pathname={location.pathname} />
              <NavSection label="Workspace" items={WORKSPACE} pathname={location.pathname} />
              <NavSection label="Compliance Tools" items={TOOLS} pathname={location.pathname} />
              <NavSection label="Account" items={ACCOUNT} pathname={location.pathname} />
              <AdminOnly>
                <NavSection label="Admin" items={ADMIN} pathname={location.pathname} />
              </AdminOnly>
            </SidebarContent>

            <SidebarFooter>
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="bg-gold text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-navy truncate">
                    {user?.email ?? ""}
                  </div>
                  {tierBadge && <div className="mt-0.5">{tierBadge}</div>}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-left px-3 py-1.5 text-xs text-slate hover:text-navy hover:bg-fog/60 rounded-md bg-transparent border-none cursor-pointer transition-colors"
              >
                Sign out
              </button>
            </SidebarFooter>
          </Sidebar>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-[46px] bg-card border-b border-fog flex items-center px-5 gap-3 flex-shrink-0">
              {title && (
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-navy text-base truncate">{title}</span>
                  {subtitle && <span className="text-xs text-slate truncate">{subtitle}</span>}
                </div>
              )}
            </div>
            <main
              ref={contentRef}
              className="flex-1 overflow-y-auto bg-background"
            >
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AppShellContext.Provider>
  );
}
