import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronRight, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import ClientContextBar from "@/components/ClientContextBar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Helper component for icon images with fallback
const IconImage = ({ src, fallback, alt = "" }: { src?: string; fallback: string; alt?: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <span className="text-base">{fallback || "\ud83d\udccc"}</span>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-4 h-3 object-cover rounded-[2px]"
      onError={() => setHasError(true)}
    />
  );
};

interface NavSubItem {
  icon: string;
  iconImage?: string;
  label: string;
  description?: string;
  /** Optional native hover tooltip (title attribute). */
  tooltip?: string;
  badge?: string;
  badgeGreen?: boolean;
  href: string;
}

interface NavSection {
  header?: string;
  /** Optional badge displayed next to the section header (e.g. "FREE"). */
  headerBadge?: string;
  headerBadgeGreen?: boolean;
  divider?: boolean;
  /** Explicit column placement for wide multi-column dropdowns (1-based). */
  column?: 1 | 2 | 3;
  items: NavSubItem[];
}

interface NavItem {
  label: string;
  href?: string;
  /** Render the top-level label in the brand amber accent (used for Pricing). */
  accent?: boolean;
  /** Suppress the chevron even if `sections` is absent (default already has none). */
  wide?: boolean;
  columns?: 2 | 3;
  sections?: NavSection[];
  /** Visually de-emphasize this top-level item (secondary nav). */
  dim?: boolean;
  /** Mark as a direct link (not a dropdown) with a small cobalt indicator dot. */
  directLink?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Intelligence",
    wide: true,
    columns: 2,
    sections: [
      {
        header: "Intelligence subscription",
        headerBadge: "PRO",
        column: 1,
        items: [
          { icon: "⭐", label: "Weekly Privacy Intelligence Report", href: "/get-intelligence" },
          { icon: "🛰️", label: "Regulatory Trend Forecast", href: "/horizon" },
          { icon: "🗄️", label: "Global Enforcement Database", href: "/enforcement?view=archive" },
          { icon: "📄", label: "Sample Privacy Intelligence Report", badge: "FREE", badgeGreen: true, href: "/#brief" },
        ],
      },
      {
        header: "Free exploration tools",
        headerBadge: "FREE",
        headerBadgeGreen: true,
        column: 2,
        items: [
          { icon: "🗺️", label: "Interactive Global Map", href: "/jurisdictions" },
          { icon: "📊", label: "State Law Comparison", href: "/compare/us-states" },
          { icon: "📊", label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { icon: "📅", label: "Compliance Calendar", href: "/calendar" },
          { icon: "📋", label: "LI Enforcement Tracker", href: "/legitimate-interest-tracker" },
        ],
      },
    ],
  },
  {
    label: "Privacy Intelligence Feed",
    href: "/updates",
  },
  {
    label: "Compliance Tools",
    wide: true,
    columns: 3,
    sections: [
      {
        header: "Assessments",
        headerBadge: "PRO",
        column: 1,
        items: [
          { icon: "⚖️", label: "Legitimate Interest Assessment", href: "/li-assessment",
            tooltip: "Full three-part documented LIA, calibrated to enforcement decisions" },
          { icon: "🛡️", label: "Privacy Program Assessment", href: "/governance-assessment",
            tooltip: "Scored programme health check against what regulators actually enforce" },
          { icon: "📑", label: "Data Protection Impact Assessment", href: "/dpia-framework",
            tooltip: "EDPB-aligned DPIA for high-risk processing activities" },
          { icon: "👁️", label: "Biometric Compliance Assessment", href: "/biometric-checker",
            tooltip: "BIPA statutory exposure calculator and multi-jurisdiction analysis" },
          { icon: "🚨", label: "Breach Response Playbook", href: "/ir-playbook",
            tooltip: "Sequenced incident response plan with regulator notification deadlines" },
        ],
      },
      {
        header: "Compliance Documents",
        headerBadge: "PRO",
        column: 2,
        items: [
          { icon: "📝", label: "Custom DPA Generator", href: "/dpa-generator",
            tooltip: "Article 28-compliant data processing agreement, enforcement-informed" },
          { icon: "📂", label: "Registration Filings", href: "/registration-manager",
            tooltip: "DPO, controller, and AI Act filings across 50+ jurisdictions" },
          { icon: "📋", label: "RoPA Builder", href: "/ropa",
            tooltip: "Versioned Article 30 record of processing activities, per-activity entry" },
          { icon: "📋", label: "US Privacy Notice Builder", href: "/us-notices",
            tooltip: "State-specific notices: CCPA, Virginia, Colorado, and more" },
          { icon: "🌍", label: "EU & Global Notice Builder", href: "/eu-notices",
            tooltip: "GDPR Article 13/14 notices with multi-jurisdiction overlays" },
        ],
      },
      {
        header: "CPPA Suite · California",
        headerBadge: "PRO",
        column: 3,
        items: [
          { icon: "🏛️", label: "CPPA Scope Checker", badge: "FREE", badgeGreen: true, href: "/cppa-scope-checker",
            tooltip: "Find out if your organisation is in scope for the Dec 31, 2027 audit" },
          { icon: "🏛️", label: "CPPA Risk Assessment", href: "/cppa-risk-assessment",
            tooltip: "Structured risk assessment aligned to CPPA audit regulations" },
          { icon: "🔒", label: "CPPA Cybersecurity Readiness", href: "/cppa-cybersecurity",
            tooltip: "18-control gap analysis for the April 2028 certification deadline" },
          { icon: "🧭", label: "Explore the full toolkit →", href: "/tools",
            tooltip: "See descriptions, pricing, and access details for every tool" },
        ],
      },
    ],
  },
  {
    label: "Research",
    wide: true,
    columns: 2,
    sections: [
      {
        header: "Laws & frameworks",
        headerBadge: "FREE",
        headerBadgeGreen: true,
        column: 1,
        items: [
          { icon: "\ud83c\uddfa\ud83c\uddf8", iconImage: "/us-flag.svg", label: "U.S. Privacy Laws", href: "/us-privacy-laws" },
          { icon: "⚖️", label: "GDPR & UK GDPR", href: "/gdpr-enforcement" },
          { icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" },
          { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { icon: "📜", label: "Legislation in Progress", href: "/legislation-tracker" },
        ],
      },
      {
        header: "Directories",
        headerBadge: "FREE",
        headerBadgeGreen: true,
        column: 1,
        items: [
          { icon: "🌍", label: "Global Privacy Authorities", href: "/global-privacy-authorities" },
          { icon: "📖", label: "Key Privacy Terms", href: "/glossary" },
        ],
      },
      {
        header: "Practitioner guides",
        headerBadge: "FREE",
        headerBadgeGreen: true,
        column: 2,
        items: [
          { icon: "🔄", label: "Cross-Border Transfers Guide", href: "/cross-border-transfers" },
          { icon: "👁️", label: "Biometric Privacy Guide", href: "/biometric-privacy" },
          { icon: "🏥", label: "Health Data Privacy Guide", href: "/health-data-privacy" },
          { icon: "🍪", label: "Cookie Consent Guide", href: "/cookie-consent" },
          { icon: "🚨", label: "Breach Response Guide", href: "/breach-notification" },
        ],
      },
    ],
  },
  {
    label: "Pricing",
    href: "/subscribe",
    accent: true,
  },
];

/** Compact user-icon dropdown that replaces Account + Sign Out in the logged-in nav. */
const UserMenu = ({ onSignOut }: { onSignOut: () => void | Promise<void> }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border border-transparent hover:border-fog hover:bg-fog/40 transition-colors cursor-pointer text-slate hover:text-navy"
      >
        <UserCircle2 className="w-6 h-6" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[180px] bg-card border border-fog rounded-xl shadow-eup-md py-1.5 z-50"
        >
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-[13px] font-medium text-navy hover:bg-fog no-underline"
          >
            Account settings
          </Link>
          <div className="border-t border-fog my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await onSignOut();
            }}
            className="block w-full text-left px-4 py-2 text-[13px] font-medium text-slate hover:text-navy hover:bg-fog bg-transparent border-none cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [briefLabel, setBriefLabel] = useState<string | null>(null);
  const { tier } = useSubscriptionTier();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsPremium(data?.is_premium ?? false));
  }, [user]);

  useEffect(() => {
    supabase
      .from("weekly_briefs")
      .select("week_label")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBriefLabel(`${data[0].week_label} Brief`);
        }
      });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderSubItem = (sub: NavSubItem, mobile = false) => {
    const link = (
      <Link
        key={sub.label}
        to={sub.href}
        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy ${mobile ? "" : ""}`}
        onClick={() => {
          if (mobile) setMobileOpen(false);
          setOpenDropdown(null);
        }}
      >
        <span className="flex items-center justify-center w-5 shrink-0 mt-0.5">
          <IconImage src={sub.iconImage} fallback={sub.icon} />
        </span>
        <span className="flex-1 text-left min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{sub.label}</span>
            {sub.badge && (
              <span
                className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full ${
                  sub.badgeGreen
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-blue/10 text-blue border border-blue/20"
                }`}
              >
                {sub.badge}
              </span>
            )}
          </span>
          {sub.description && (
            <span className="block text-[12px] text-slate-light mt-0.5 leading-snug">
              {sub.description}
            </span>
          )}
        </span>
      </Link>
    );

    if (!sub.tooltip || mobile) return link;

    return (
      <Tooltip key={sub.label} delayDuration={250}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={14}
          className="max-w-[280px] text-[12px] leading-snug"
        >
          {sub.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <>
    <nav className="bg-[#0D1F35] border-b border-[#0D1F35] sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 md:h-16">
        {/* Logo */}
        <Link to="/" className="no-underline flex items-center">
          <img src="/logo.png" alt="End User Privacy" className="h-10 w-auto" />
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.href
              ? location.pathname === item.href
              : item.sections?.some((s) =>
                  s.items.some((sub) => location.pathname.startsWith(sub.href.split("?")[0]))
                ) ?? false;
            const baseTopClasses = "relative flex items-center gap-1 px-2 py-2 transition-colors no-underline font-semibold text-[15px]";
            const activeUnderline = isActive
              ? "after:content-[''] after:absolute after:left-2 after:right-2 after:-bottom-[1px] after:h-[2px] after:bg-[hsl(var(--accent))]"
              : "";
            const colorClasses = item.accent
              ? `text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-light))]`
              : `${isActive ? "text-white" : "text-white/80 hover:text-white"}`;
            return (
              <div
                key={item.label}
                className="relative group"
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {item.href ? (
                  <Link to={item.href} className={`${baseTopClasses} ${colorClasses} ${activeUnderline}`}>
                    {item.label}
                    {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`${baseTopClasses} ${colorClasses} ${activeUnderline} cursor-pointer bg-transparent border-none`}
                  >
                    {item.label}
                    {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                )}

                {item.sections && openDropdown === item.label && (
                  <div className="absolute top-full left-0 pt-1 z-50">
                    <div
                      className={`bg-card border border-fog rounded-xl shadow-eup-md p-2 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain ${
                        item.wide
                          ? item.columns === 3
                            ? "min-w-[840px] grid grid-cols-3 gap-x-3 items-start"
                            : "min-w-[640px] grid grid-cols-2 gap-x-3 items-start"
                          : "min-w-[280px]"
                      }`}
                    >
                      {(() => {
                        const renderSection = (section: NavSection, si: number) => (
                          <div key={si}>
                            {section.divider && !item.wide && <div className="border-t border-fog my-1.5" />}
                            {section.header && (
                              <div className="px-3 pt-2 pb-1 flex items-center gap-2">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-light">
                                  {section.header}
                                </span>
                                {section.headerBadge && (
                                  <span
                                    className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full ${
                                      section.headerBadgeGreen
                                        ? "bg-accent/10 text-accent border border-accent/20"
                                        : "bg-blue/10 text-blue border border-blue/20"
                                    }`}
                                  >
                                    {section.headerBadge}
                                  </span>
                                )}
                              </div>
                            )}
                            {section.items.map((sub) => renderSubItem(sub))}
                          </div>
                        );
                        if (!item.wide) return item.sections.map(renderSection);
                        const totalCols = item.columns ?? 2;
                        return Array.from({ length: totalCols }, (_, i) => {
                          const colNum = i + 1;
                          const colSections = item.sections.filter((s) => (s.column ?? 1) === colNum);
                          return (
                            <div key={colNum} className="flex flex-col">
                              {colSections.map((s, idx) => renderSection(s, idx))}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-[12px] font-semibold text-white bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-light))] px-4 py-2 rounded-lg no-underline transition-all"
              >
                🧠 My Dashboard
              </Link>
              {!isPremium && (
                <Link
                  to="/subscribe"
                  className="text-[12px] font-semibold text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-light))] no-underline transition-colors flex items-center gap-1"
                >
                  ⭐ See plans
                </Link>
              )}
              {(tier === "annual" || tier === "annual_founding") && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                  Platform
                </span>
              )}
              {tier === "monthly" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300">
                  Intelligence
                </span>
              )}
              {tier === "free" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/15 text-white border border-white/25">
                  FREE PLAN
                </span>
              )}
              <UserMenu onSignOut={handleSignOut} />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[12px] font-medium text-white/80 hover:text-white no-underline transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-white/10 text-white border border-white/25 hover:bg-white/20 transition-colors no-underline"
              >
                Sign up free
              </Link>
              <Link
                to="/subscribe"
                className="text-[12px] font-semibold text-white bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-light))] px-4 py-2 rounded-lg no-underline transition-all"
              >
                See Plans →
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-white bg-transparent border-none cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-fog bg-card px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.href && !item.sections ? (
                <Link
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-[14px] font-medium no-underline ${
                    item.accent ? "text-amber-500" : "text-navy"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <>
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 text-[14px] font-medium text-navy bg-transparent border-none cursor-pointer"
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.label ? null : item.label)
                    }
                  >
                    {item.label}
                    <ChevronRight
                      className={`w-4 h-4 text-slate transition-transform ${
                        openDropdown === item.label ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {item.sections && openDropdown === item.label && (
                    <div className="pl-4 pb-2 space-y-0.5">
                      {item.sections.map((section, si) => (
                        <div key={si}>
                          {section.header && (
                            <div className="px-3 pt-2 pb-1 flex items-center gap-2">
                              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-light">
                                {section.header}
                              </span>
                              {section.headerBadge && (
                                <span
                                  className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full ${
                                    section.headerBadgeGreen
                                      ? "bg-accent/10 text-accent border border-accent/20"
                                      : "bg-blue/10 text-blue border border-blue/20"
                                  }`}
                                >
                                  {section.headerBadge}
                                </span>
                              )}
                            </div>
                          )}
                          {section.items.map((sub) => renderSubItem(sub, true))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          <div className="pt-3 border-t border-fog space-y-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block text-center text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2.5 rounded-lg no-underline"
                  onClick={() => {
                    setMobileOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  🧠 My Dashboard
                </Link>
                {!isPremium && (
                  <Link
                    to="/subscribe"
                    className="block text-center text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg no-underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    ⭐ See plans
                  </Link>
                )}
                <Link
                  to="/account"
                  className="block text-center text-[13px] font-medium text-slate border border-fog px-4 py-2.5 rounded-lg no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Account settings
                </Link>
                <button
                  onClick={async () => {
                    setMobileOpen(false);
                    await handleSignOut();
                  }}
                  className="w-full text-center text-[13px] font-medium text-slate border border-fog px-4 py-2.5 rounded-lg bg-transparent cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-center text-[13px] font-medium text-navy border border-fog px-4 py-2.5 rounded-lg no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/subscribe"
                  className="block text-center text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2.5 rounded-lg no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  See Plans →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
    <ClientContextBar />
    </>
  );
};

export default Navbar;
