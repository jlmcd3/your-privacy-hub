import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Rss,
  Gavel,
  Telescope,
  FolderOpen,
  Bookmark,
  FileCheck,
  Building2,
  LayoutGrid,
  SlidersHorizontal,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  BookOpen,
  ScrollText,
  Globe2,
  Cpu,
  Map as MapIcon,
  ListChecks,
  CalendarDays,
  GitCompare,
  Scale,
  ShieldCheck,
  Building,
  ArrowLeftRight,
  Fingerprint,
  Activity,
  AlertTriangle,
  Cookie,
  Flag,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import AdminOnly from "@/components/AdminOnly";
import ClientContextBar from "@/components/ClientContextBar";
import ScrollToTopButton from "@/components/ScrollToTopButton";
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
  pulse?: boolean;
}

const INTELLIGENCE_PUBLIC: NavItemDef[] = [
  { label: "Privacy Intelligence Feed", href: "/updates", icon: Rss, pulse: true },
];

const INTELLIGENCE_AUTH_EXTRA: NavItemDef[] = [
  { label: "Intelligence Report", href: "/dashboard", icon: FileText },
];

const INTELLIGENCE_TAIL: NavItemDef[] = [
  { label: "Enforcement Database", href: "/enforcement", icon: Gavel },
  { label: "Regulatory Forecast", href: "/horizon", icon: Telescope },
];

const FEED_REGIONS: NavItemDef[] = [
  { label: "U.S. Federal", href: "/updates?region=us-federal", icon: Flag },
  { label: "U.S. States", href: "/updates?region=us-states", icon: MapIcon },
  { label: "EU & UK", href: "/updates?region=eu-uk", icon: Globe2 },
  { label: "Global", href: "/updates?region=global", icon: Globe2 },
];

const FREE_TOOLS: NavItemDef[] = [
  { label: "Interactive Global Map", href: "/jurisdictions", icon: MapIcon },
  { label: "State Law Comparison", href: "/compare/us-states", icon: GitCompare },
  { label: "LI Enforcement Tracker", href: "/legitimate-interest-tracker", icon: Scale },
  { label: "CPPA Scope Checker", href: "/cppa-scope-checker", icon: ShieldCheck },
];

const TOOLS: NavItemDef[] = [
  { label: "All Tools", href: "/tools", icon: LayoutGrid },
];

const RESEARCH: NavItemDef[] = [
  // Laws & Frameworks
  { label: "U.S. Privacy Laws", href: "/us-privacy-laws", icon: ScrollText },
  { label: "GDPR & UK GDPR", href: "/gdpr-enforcement", icon: BookOpen },
  { label: "Global Privacy Laws", href: "/global-privacy-laws", icon: Globe2 },
  { label: "AI Privacy Regulations", href: "/ai-privacy-regulations", icon: Cpu },
  { label: "Legislation Tracker", href: "/legislation-tracker", icon: ListChecks },
  // Directories
  { label: "Global Authorities", href: "/global-privacy-authorities", icon: Building },
  { label: "Jurisdictions Map", href: "/jurisdictions", icon: MapIcon },
  { label: "Glossary", href: "/glossary", icon: BookOpen },
  // Practitioner Guides
  { label: "Cross-Border Transfers", href: "/cross-border-transfers", icon: ArrowLeftRight },
  { label: "Biometric Privacy", href: "/biometric-privacy", icon: Fingerprint },
  { label: "Health Data Privacy", href: "/health-data-privacy", icon: Activity },
  { label: "Cookie Consent", href: "/cookie-consent", icon: Cookie },
  { label: "Breach Notification", href: "/breach-notification", icon: AlertTriangle },
  { label: "Compliance Calendar", href: "/calendar", icon: CalendarDays },
];

const WORKSPACE: NavItemDef[] = [
  { label: "My Reports", href: "/dashboard/reports", icon: FolderOpen },
  { label: "Watchlist", href: "/watchlist", icon: Bookmark },
  { label: "Filings", href: "/registration-manager/my-filings", icon: FileCheck },
  { label: "Clients", href: "/clients", icon: Building2 },
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

function NavItem({ item, pathname }: { item: NavItemDef; pathname: string }) {
  const active = isItemActive(item, pathname);
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link to={item.href}>
          {item.pulse ? (
            <span className="relative inline-flex items-center justify-center w-4 h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
            </span>
          ) : (
            <Icon className="w-4 h-4" />
          )}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
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
        {items.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function ResearchSection({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarGroup>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground bg-transparent border-none cursor-pointer"
          >
            <span>Research</span>
            {open ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu>
            {RESEARCH.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

function MobileMenuButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="md:hidden p-1 text-slate hover:text-navy bg-transparent border-none cursor-pointer"
      aria-label="Toggle navigation"
    >
      <Menu className="w-5 h-5" />
    </button>
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

  const intelligenceItems = user
    ? [INTELLIGENCE_PUBLIC[0], ...INTELLIGENCE_AUTH_EXTRA, ...INTELLIGENCE_TAIL]
    : [...INTELLIGENCE_PUBLIC, ...INTELLIGENCE_TAIL];

  return (
    <AppShellContext.Provider value={{ setTitle, setSubtitle }}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar className="w-[220px]">
            <SidebarHeader>
              <Link
                to="/"
                className="flex items-center gap-2 px-2 py-2 no-underline hover:opacity-80 transition-opacity"
              >
                <span className="bg-white rounded-md px-2 py-1 inline-flex items-center flex-shrink-0">
                  <img src="/logo.png" alt="End User Privacy" className="h-6 w-auto" />
                </span>
                <span className="font-semibold text-navy text-sm leading-tight">
                  End User Privacy
                </span>
              </Link>
            </SidebarHeader>

            <SidebarContent>
              <NavSection label="Intelligence" items={intelligenceItems} pathname={location.pathname} />
              <NavSection label="Compliance Tools" items={TOOLS} pathname={location.pathname} />
              <ResearchSection pathname={location.pathname} />
              {user && (
                <>
                  <NavSection label="Workspace" items={WORKSPACE} pathname={location.pathname} />
                  <NavSection label="Account" items={ACCOUNT} pathname={location.pathname} />
                </>
              )}
              <AdminOnly>
                <NavSection label="Admin" items={ADMIN} pathname={location.pathname} />
              </AdminOnly>
            </SidebarContent>

            <SidebarFooter>
              {!user && (
                <div className="px-3 pt-3 pb-1 border-t border-fog">
                  <Link
                    to="/subscribe"
                    className="block text-center bg-gold text-white rounded-xl py-2 text-sm font-semibold no-underline hover:opacity-90 transition-all"
                  >
                    See Plans → $29/mo or $399/yr
                  </Link>
                </div>
              )}

              {user && <ClientContextBar />}

              {user ? (
                <>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <span className="bg-gold text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-navy truncate">
                        {user.email ?? ""}
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
                </>
              ) : (
                <div className="px-3 py-3 flex flex-col gap-2">
                  <Link
                    to="/signup"
                    className="block text-center bg-gold text-white rounded-xl py-2 text-sm font-semibold no-underline hover:opacity-90"
                  >
                    Sign up free
                  </Link>
                  <Link
                    to="/login"
                    className="block text-center border border-fog text-navy rounded-xl py-2 text-sm font-semibold no-underline hover:bg-fog"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              <div className="px-3 py-2 flex gap-3 flex-wrap border-t border-fog">
                {[
                  { label: "Terms", href: "/terms" },
                  { label: "Privacy", href: "/privacy-policy" },
                  { label: "About", href: "/about" },
                  { label: "Contact", href: "/contact" },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    to={href}
                    className="text-[10px] text-slate hover:text-navy no-underline"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </SidebarFooter>
          </Sidebar>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-[40px] bg-card border-b border-fog flex items-center px-4 gap-3 flex-shrink-0">
              <MobileMenuButton />
              {title && (
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-navy text-sm truncate">{title}</span>
                  {subtitle && <span className="text-xs text-slate truncate">{subtitle}</span>}
                </div>
              )}
            </div>
            <main
              ref={contentRef}
              className="flex-1 overflow-y-auto bg-background relative"
            >
              <Outlet />
              <ScrollToTopButton />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AppShellContext.Provider>
  );
}
