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
  /** Pin to the bottom of its column in wide multi-column dropdowns. */
  bottom?: boolean;
}

interface NavSection {
  header?: string;
  /** Optional badge displayed next to the section header (e.g. "FREE"). */
  headerBadge?: string;
  headerBadgeGreen?: boolean;
  /** Muted access subline below the section header. */
  headerSub?: string;
  /** Tailwind text-colour class for the section title. */
  headerColor?: string;
  /** Tailwind bg class applied to the column wrapper. */
  columnBg?: string;
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
    label: "Feed",
    href: "/updates",
    directLink: true,
  },
  {
    label: "Intelligence",
    wide: true,
    columns: 2,
    sections: [
      {
        header: "Intelligence subscription",
        headerSub: "Intel & Pro · monthly or annual",
        headerColor: "text-[#185FA5]",
        columnBg: "bg-[#EEF4FB]",
        column: 1,
        items: [
          { icon: "⭐", label: "Weekly Privacy Intelligence Report", href: "/get-intelligence" },
          { icon: "🛰️", label: "Regulatory Trend Forecast", href: "/horizon" },
          { icon: "🗄️", label: "Global Enforcement Database", href: "/enforcement?view=archive",
            description: "Full archive · 4,800+ decisions" },
        ],
      },
      {
        header: "Free exploration tools",
        headerSub: "No account required",
        headerColor: "text-brand-mist",
        columnBg: "bg-white",
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
    label: "Tools",
    wide: true,
    columns: 3,
    sections: [
      {
        header: "Smart Assessments",
        headerSub: "Per use · any tier",
        headerColor: "text-[#185FA5]",
        columnBg: "bg-[#EEF4FB]",
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
          { icon: "📝", label: "Custom DPA Generator", href: "/dpa-generator",
            tooltip: "Article 28-compliant data processing agreement, enforcement-informed" },
        ],
      },
      {
        header: "Convenience Documents",
        headerSub: "Free from pool · Intel & Pro",
        headerColor: "text-[#3B6D11]",
        columnBg: "bg-[#F3FAF0]",
        column: 2,
        items: [
          { icon: "🚨", label: "Breach Response Playbook", href: "/ir-playbook",
            tooltip: "Sequenced incident response plan with regulator notification deadlines. Free within Intel/Pro pool." },
          { icon: "📋", label: "US Privacy Notice Builder", href: "/us-notice-builder",
            tooltip: "State-specific notices: CCPA, Virginia, Colorado, and more. Free within Intel/Pro pool." },
          { icon: "🌍", label: "EU & Global Notice Builder", href: "/eu-global-notice-builder",
            tooltip: "GDPR Article 13/14 notices with multi-jurisdiction overlays. Free within Intel/Pro pool." },
          { icon: "📋", label: "RoPA Builder", href: "/ropa-builder",
            tooltip: "Versioned Article 30 record of processing activities. Free within Intel/Pro pool." },
          { icon: "📂", label: "Registration Filings", href: "/registration-manager",
            tooltip: "DPO, controller, and AI Act filings across 50+ jurisdictions. Free within Intel/Pro pool." },
        ],
      },
      {
        header: "CPPA Suite · California",
        headerSub: "",
        headerColor: "text-[#185FA5]",
        columnBg: "cppa-split",
        column: 3,
        items: [
          { icon: "🏛️", label: "CPPA Risk Assessment", href: "/cppa-risk-assessment",
            tooltip: "Structured risk assessment aligned to CPPA audit regulations" },
          { icon: "🔒", label: "CPPA Cybersecurity Readiness", href: "/cppa-cybersecurity",
            tooltip: "18-control gap analysis for the April 2028 certification deadline" },
          { icon: "🏛️", label: "CPPA Scope Checker", href: "/cppa-scope-checker",
            badge: "FREE", badgeGreen: true,
            tooltip: "Find out if your organisation is in scope for the Dec 31, 2027 audit" },
          { icon: "🧭", label: "Explore the full toolkit →", href: "/tools", bottom: true,
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
        headerSub: "Free · no account needed",
        headerColor: "text-brand-mist",
        columnBg: "bg-white",
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
        headerSub: "Free · no account needed",
        headerColor: "text-brand-mist",
        columnBg: "bg-white",
        divider: true,
        column: 1,
        items: [
          { icon: "🌍", label: "Global Privacy Authorities", href: "/global-privacy-authorities" },
          { icon: "📖", label: "Key Privacy Terms", href: "/glossary" },
        ],
      },
      {
        header: "Practitioner guides",
        headerSub: "Free · no account needed",
        headerColor: "text-brand-mist",
        columnBg: "bg-white",
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
        className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border border-transparent hover:border-brand-cloud hover:bg-brand-cloud/40 transition-colors cursor-pointer text-slate hover:text-brand-navy"
      >
        <UserCircle2 className="w-6 h-6" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[180px] bg-card border border-brand-cloud rounded-xl shadow-eup-md py-1.5 z-50"
        >
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cloud no-underline"
          >
            Account settings
          </Link>
          <div className="border-t border-brand-cloud my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await onSignOut();
            }}
            className="block w-full text-left px-4 py-2 text-sm font-medium text-slate hover:text-brand-navy hover:bg-brand-cloud bg-transparent border-none cursor-pointer"
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const el = dropdownRef.current;
    if (!el) return;
    const adjust = () => {
      el.style.marginLeft = "";
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 8;
      let delta = 0;
      if (rect.right > vw - margin) delta = vw - margin - rect.right;
      if (rect.left + delta < margin) delta = margin - rect.left;
      if (delta !== 0) el.style.marginLeft = `${delta}px`;
    };
    adjust();
    window.addEventListener("resize", adjust);
    return () => window.removeEventListener("resize", adjust);
  }, [openDropdown]);
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
        className={`flex items-start px-3 py-2 rounded-lg hover:bg-brand-cloud transition-colors no-underline text-sm text-brand-navy ${mobile ? "" : ""}`}
        onClick={() => {
          if (mobile) setMobileOpen(false);
          setOpenDropdown(null);
        }}
      >
        <span className="flex-1 text-left min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{sub.label}</span>
            {sub.badge && (
              <span
                className={`text-[11px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full ${
                  sub.badgeGreen
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-brand-teal/10 text-brand-teal border border-brand-teal/20"
                }`}
              >
                {sub.badge}
              </span>
            )}
          </span>
          {sub.description && (
            <span className="block text-meta text-brand-mist mt-0.5 leading-snug">
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
    <nav className="bg-brand-navy border-b border-brand-navy sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-14 md:h-16">
        {/* Logo */}
        <div className="flex items-center flex-1">
          <Link to="/" className="no-underline flex items-center">
            <img src="/logo.svg" alt="End User Privacy" width={260} height={48} className="h-10 w-auto shrink-0 object-contain" />
          </Link>
        </div>
        {/* Desktop nav */}
        <div className="hidden lg:flex items-center justify-center gap-1 lg:gap-2 xl:gap-4 shrink-0">
          {navItems.map((item) => {
            const isActive = item.href
              ? location.pathname === item.href
              : item.sections?.some((s) =>
                  s.items.some((sub) => location.pathname.startsWith(sub.href.split("?")[0]))
                ) ?? false;
            const basePadX = item.directLink ? "px-2 lg:px-4" : "px-2 lg:px-3";
            const baseTopClasses = `relative flex items-center gap-1 whitespace-nowrap ${basePadX} py-2 transition-colors no-underline text-nav text-[15px] lg:text-base`;
            const activeUnderline = isActive
              ? "after:content-[''] after:absolute after:left-3 after:right-3 after:-bottom-[1px] after:h-[2px] after:bg-[hsl(var(--accent))]"
              : "";
            const colorClasses = item.accent
              ? `text-[hsl(142,76%,55%)] hover:text-[hsl(142,76%,70%)]`
              : `text-white hover:text-white`;
            const dimClass = item.dim ? "opacity-80 hover:opacity-100" : "";
            const directDot = item.directLink
              ? "before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[hsl(var(--cobalt))]"
              : "";
            return (
              <div
                key={item.label}
                className="relative group"
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {item.href ? (
                  <Link to={item.href} className={`${baseTopClasses} ${colorClasses} ${activeUnderline} ${dimClass} ${directDot}`}>
                    {item.label}
                    {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`${baseTopClasses} ${colorClasses} ${activeUnderline} ${dimClass} cursor-pointer bg-transparent border-none`}
                  >
                    {item.label}
                    {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                )}

                {item.sections && openDropdown === item.label && (
                  <div ref={dropdownRef} className="absolute left-0 top-full pt-1 z-50">
                    <div
                      className={`bg-card border border-brand-cloud rounded-xl shadow-eup-md overflow-hidden max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain ${
                        item.wide
                          ? item.columns === 3
                            ? "w-[840px] lg:grid lg:grid-cols-3 gap-x-0 items-stretch"
                            : "w-[640px] lg:grid lg:grid-cols-2 gap-x-0 items-stretch"
                          : "min-w-[280px]"
                      }`}
                    >
                      {(() => {
                        const renderSection = (section: NavSection, si: number) => {
                          const topItems = section.items.filter((it) => !it.bottom);
                          return (
                            <div key={si}>
                              {section.divider && !item.wide && <div className="border-t border-brand-cloud my-1.5" />}
                              {section.header && (
                                <div className="px-3 pt-2 pb-1 flex items-center gap-2">
                                  <span className="text-eyebrow text-brand-mist">
                                    {section.header}
                                  </span>
                                  {section.headerBadge && (
                                    <span
                                      className={`text-[11px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full ${
                                        section.headerBadgeGreen
                                          ? "bg-accent/10 text-accent border border-accent/20"
                                          : "bg-brand-teal/10 text-brand-teal border border-brand-teal/20"
                                      }`}
                                    >
                                      {section.headerBadge}
                                    </span>
                                  )}
                                </div>
                              )}
                              {topItems.map((sub) => renderSubItem(sub))}
                            </div>
                          );
                        };
                        if (!item.wide) return item.sections.map(renderSection);

                        // Wide dropdown: B+C column treatment
                        const totalCols = item.columns ?? 2;
                        return Array.from({ length: totalCols }, (_, i) => {
                          const colNum = (i + 1) as 1 | 2 | 3;
                          const colSections = item.sections!.filter((s) => (s.column ?? 1) === colNum);
                          if (colSections.length === 0) return null;

                          const isCppaSplit = colSections.some((s) => s.columnBg === "cppa-split");

                          if (isCppaSplit) {
                            const sec = colSections[0];
                            const paidItems = sec.items.filter((it) => !it.bottom && it.badge !== "FREE");
                            const freeItem = sec.items.find((it) => it.badge === "FREE");
                            const ctaItem = sec.items.find((it) => it.bottom);

                            return (
                              <div key={colNum} className="flex flex-col h-full overflow-hidden border-r border-brand-cloud last:border-r-0">
                                {/* Blue zone: header + paid tools */}
                                <div className="bg-[#EEF4FB] px-3 pt-3 pb-2 flex-shrink-0">
                                  <div className="pb-2 mb-2 border-b border-[#C0D5EE]">
                                    <span className={`text-eyebrow font-semibold ${sec.headerColor ?? "text-[#185FA5]"}`}>
                                      {sec.header}
                                    </span>
                                  </div>
                                  {paidItems.map((sub) => renderSubItem(sub))}
                                </div>

                                {/* White zone: free Scope Checker */}
                                {freeItem && (
                                  <div className="bg-white border-t border-b border-[#C0D5EE] px-3 py-1.5">
                                    {renderSubItem(freeItem)}
                                  </div>
                                )}

                                {/* White zone: CTA in gold */}
                                {ctaItem && (
                                  <div className="bg-white px-3 pb-3 pt-2 mt-auto">
                                    <Link
                                      to={ctaItem.href}
                                      className="block text-sm font-medium text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-light))] no-underline transition-colors"
                                      onClick={() => setOpenDropdown(null)}
                                    >
                                      {ctaItem.label}
                                    </Link>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const colBg = colSections[0]?.columnBg ?? "bg-card";

                          const renderSectionBc = (section: NavSection, si: number) => {
                            const topItems = section.items.filter((it) => !it.bottom);
                            return (
                              <div key={si}>
                                {section.divider && (
                                  <div className="border-t border-brand-cloud my-2 mx-1" />
                                )}
                                {section.header && (
                                  <div className="px-3 pt-3 pb-2">
                                    <span
                                      className={`text-eyebrow font-semibold block ${
                                        section.headerColor ?? "text-brand-mist"
                                      }`}
                                    >
                                      {section.header}
                                    </span>
                                    {section.headerSub && (
                                      <span className="block text-[10px] text-brand-mist/70 mt-0.5">
                                        {section.headerSub}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {topItems.map((sub) => renderSubItem(sub))}
                              </div>
                            );
                          };

                          const bottomItems = colSections.flatMap((s) => s.items.filter((it) => it.bottom));
                          return (
                            <div
                              key={colNum}
                              className={`flex flex-col h-full border-r border-brand-cloud last:border-r-0 ${colBg}`}
                            >
                              {colSections.map(renderSectionBc)}
                              {bottomItems.length > 0 && (
                                <div className="mt-auto pt-2 px-3 pb-3">
                                  {bottomItems.map((sub) => renderSubItem(sub))}
                                </div>
                              )}
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
        <div className="hidden lg:flex items-center gap-3 ml-auto">
          {/* Always-visible Pricing link */}
          <Link
            to="/subscribe"
            className={`text-xs lg:text-sm font-semibold no-underline transition-colors px-2 lg:px-3 py-2 ${
              location.pathname === "/subscribe"
                ? "text-[hsl(var(--accent-light))]"
                : "text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-light))]"
            }`}
          >
            Pricing
          </Link>
          {/* Sign In — only when logged out */}
          {!user && (
            <Link
              to="/login"
              className={`text-xs lg:text-sm font-semibold no-underline transition-colors px-2 lg:px-3 py-2 ${
                location.pathname === "/login"
                  ? "text-[hsl(var(--accent-light))]"
                  : "text-white hover:text-white/80"
              }`}
            >
              Sign In
            </Link>
          )}

          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-xs xl:text-sm font-semibold text-white bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-light))] px-3 xl:px-4 py-1.5 xl:py-2 rounded-lg no-underline transition-all whitespace-nowrap"
              >
                🧠 My Dashboard
              </Link>
              <UserMenu onSignOut={handleSignOut} />
            </>
          ) : (
            <Link
              to="/signup"
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-white/10 text-white border border-white/25 hover:bg-white/20 transition-colors no-underline"
            >
              Sign up free
            </Link>
          )}
        </div>


        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-white bg-transparent border-none cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-brand-cloud bg-card px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.href && !item.sections ? (
                <Link
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-[14px] font-medium no-underline ${
                    item.accent ? "text-amber-500" : "text-brand-navy"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <>
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 text-[14px] font-medium text-brand-navy bg-transparent border-none cursor-pointer"
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
                            <div className="px-3 pt-2 pb-1">
                              <span className="text-eyebrow text-brand-mist block">
                                {section.header}
                              </span>
                              {section.headerSub && (
                                <span className="block text-[10px] text-brand-mist/60 mt-0.5">
                                  {section.headerSub}
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
          <div className="pt-3 border-t border-brand-cloud space-y-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block text-center text-sm font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-blue px-4 py-2.5 rounded-lg no-underline"
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
                    className="block text-center text-sm font-semibold text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)] border border-[hsl(var(--accent)/0.25)] px-4 py-2.5 rounded-lg no-underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    ⭐ See plans
                  </Link>
                )}
                <Link
                  to="/account"
                  className="block text-center text-sm font-medium text-slate border border-brand-cloud px-4 py-2.5 rounded-lg no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Account settings
                </Link>
                <button
                  onClick={async () => {
                    setMobileOpen(false);
                    await handleSignOut();
                  }}
                  className="w-full text-center text-sm font-medium text-slate border border-brand-cloud px-4 py-2.5 rounded-lg bg-transparent cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-center text-sm font-medium text-brand-navy border border-brand-cloud px-4 py-2.5 rounded-lg no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/subscribe"
                  className="block text-center text-sm font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal px-4 py-2.5 rounded-lg no-underline"
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
