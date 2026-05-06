import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronRight, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import ClientContextBar from "@/components/ClientContextBar";

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
  badge?: string;
  badgeGreen?: boolean;
  href: string;
}

interface NavSection {
  header?: string;
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
}

const navItems: NavItem[] = [
  {
    label: "Intelligence",
    wide: true,
    columns: 2,
    sections: [
      {
        header: "Intelligence subscription",
        column: 1,
        items: [
          { icon: "⭐", label: "Weekly Intelligence Brief", badge: "PRO", href: "/get-intelligence",
            description: "Curated briefing filtered to your jurisdictions and roles" },
          { icon: "🛰️", label: "Regulatory Trend Forecast", badge: "PRO", href: "/horizon",
            description: "Forward-looking signals derived from enforcement patterns" },
          { icon: "🗄️", label: "Global Enforcement Database", badge: "PRO", href: "/enforcement?view=archive",
            description: "3,500+ decisions across 119 authorities, fully searchable" },
          { icon: "📄", label: "Sample Intelligence Brief", badge: "FREE", badgeGreen: true, href: "/sample-brief",
            description: "See a complete brief before subscribing" },
        ],
      },
      {
        header: "Free exploration tools",
        column: 2,
        items: [
          { icon: "🗺️", label: "Interactive Global Map", badge: "FREE", badgeGreen: true, href: "/jurisdictions",
            description: "150+ jurisdictions, spin to explore regulatory scope" },
          { icon: "📊", label: "State Law Comparison", badge: "FREE", badgeGreen: true, href: "/compare/us-states",
            description: "Side-by-side U.S. state privacy law comparison table" },
          { icon: "📊", label: "Enforcement Tracker", badge: "LIVE", badgeGreen: true, href: "/enforcement-tracker",
            description: "Real-time enforcement actions across all regulators" },
          { icon: "📅", label: "Compliance Calendar", badge: "FREE", badgeGreen: true, href: "/calendar",
            description: "Upcoming deadlines, effective dates, and renewal windows" },
          { icon: "📋", label: "LI Enforcement Tracker", badge: "FREE", badgeGreen: true, href: "/legitimate-interest-tracker",
            description: "Legitimate interest enforcement decisions by sector" },
        ],
      },
    ],
  },
  {
    label: "Compliance Tools",
    wide: true,
    columns: 3,
    sections: [
      {
        header: "Assessments",
        column: 1,
        items: [
          { icon: "⚖️", label: "Legitimate Interest Assessment", badge: "PRO", href: "/li-assessment",
            description: "Full three-part documented LIA, calibrated to enforcement decisions" },
          { icon: "🛡️", label: "Privacy Program Assessment", badge: "PRO", href: "/governance-assessment",
            description: "Scored programme health check against what regulators actually enforce" },
          { icon: "📑", label: "Data Protection Impact Assessment", badge: "PRO", href: "/dpia-framework",
            description: "EDPB-aligned DPIA for high-risk processing activities" },
          { icon: "👁️", label: "Biometric Compliance Assessment", badge: "PRO", href: "/biometric-checker",
            description: "BIPA statutory exposure calculator and multi-jurisdiction analysis" },
          { icon: "🚨", label: "Breach Response Playbook", badge: "PRO", href: "/ir-playbook",
            description: "Sequenced incident response plan with regulator notification deadlines" },
        ],
      },
      {
        header: "Compliance Documents",
        column: 2,
        items: [
          { icon: "📝", label: "Custom DPA Generator", badge: "PRO", href: "/dpa-generator",
            description: "Article 28-compliant data processing agreement, enforcement-informed" },
          { icon: "📂", label: "Registration Filings", badge: "PRO", href: "/registration-manager",
            description: "DPO, controller, and AI Act filings across 50+ jurisdictions" },
          { icon: "📋", label: "RoPA Builder", badge: "PRO", href: "/ropa",
            description: "Versioned Article 30 record of processing activities, per-activity entry" },
          { icon: "📋", label: "US Privacy Notice Builder", badge: "PRO", href: "/us-notices",
            description: "State-specific notices: CCPA, Virginia, Colorado, and more" },
          { icon: "🌍", label: "EU & Global Notice Builder", badge: "PRO", href: "/eu-notices",
            description: "GDPR Article 13/14 notices with multi-jurisdiction overlays" },
        ],
      },
      {
        header: "CPPA Suite · California",
        column: 3,
        items: [
          { icon: "🏛️", label: "CPPA Scope Checker", badge: "FREE", badgeGreen: true, href: "/cppa-scope-checker",
            description: "Find out if your organisation is in scope for the Dec 31, 2027 audit" },
          { icon: "🏛️", label: "CPPA Risk Assessment", badge: "PRO", href: "/cppa-risk-assessment",
            description: "Structured risk assessment aligned to CPPA audit regulations" },
          { icon: "🔒", label: "CPPA Cybersecurity Readiness", badge: "PRO", href: "/cppa-cybersecurity",
            description: "18-control gap analysis for the April 2028 certification deadline" },
        ],
      },
    ],
  },
  {
    label: "Regulatory Updates",
    sections: [
      {
        header: "Browse by region",
        items: [
          { icon: "\ud83c\uddfa\ud83c\uddf8", iconImage: "/us-flag.svg", label: "U.S. Federal", href: "/updates?region=us-federal",
            description: "FTC, HHS OCR, DOJ, and federal agency actions" },
          { icon: "🗺️", label: "U.S. States", href: "/updates?region=us-states",
            description: "CPPA, NY, TX, VA, CO and all active state laws" },
          { icon: "\ud83c\uddea\ud83c\uddfa", iconImage: "/eu-uk-split.svg", label: "EU & UK", href: "/updates?region=eu-uk",
            description: "EDPB, ICO, and DPAs across all EU member states" },
          { icon: "🌐", label: "Global", href: "/updates?region=global",
            description: "APAC, LATAM, Middle East, and emerging frameworks" },
          { icon: "📰", label: "Privacy Newsfeed", badge: "FREE", badgeGreen: true, href: "/updates?region=all",
            description: "All regulatory updates, unfiltered and chronological" },
        ],
      },
      {
        header: "Browse by topic",
        divider: true,
        items: [
          { icon: "🤖", label: "AI & Privacy", href: "/updates?topic=ai-privacy",
            description: "EU AI Act, automated decisions, ADMT obligations" },
          { icon: "⚖️", label: "Breaches & Enforcement", href: "/updates?topic=enforcement",
            description: "Fines, investigations, and regulatory actions" },
          { icon: "📱", label: "AdTech & Consent", href: "/updates?topic=adtech",
            description: "Consent management, cookies, and tracking" },
          { icon: "👤", label: "Biometric Data", href: "/updates?topic=biometric-data",
            description: "BIPA, GDPR Article 9, and facial recognition rules" },
          { icon: "🌐", label: "Data Transfers", href: "/updates?topic=cross-border",
            description: "SCCs, adequacy decisions, and post-Schrems II guidance" },
          { icon: "🧒", label: "Children's Privacy", href: "/updates?topic=children-privacy",
            description: "COPPA, Kids KOSA, and age assurance requirements" },
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
        column: 1,
        items: [
          { icon: "🌍", label: "Global Privacy Authorities", href: "/global-privacy-authorities" },
          { icon: "📖", label: "Key Privacy Terms", href: "/glossary" },
        ],
      },
      {
        header: "Practitioner guides",
        column: 2,
        items: [
          { icon: "🔄", label: "Cross-Border Transfers Guide", href: "/cross-border-transfers",
            description: "SCCs, adequacy decisions, and derogations explained" },
          { icon: "👁️", label: "Biometric Privacy Guide", href: "/biometric-privacy",
            description: "BIPA, GDPR Article 9, and state biometric data laws" },
          { icon: "🏥", label: "Health Data Privacy Guide", href: "/health-data-privacy",
            description: "HIPAA, state health privacy laws, and sensitive data rules" },
          { icon: "🍪", label: "Cookie Consent Guide", href: "/cookie-consent",
            description: "ePrivacy Directive, GDPR requirements, and TCF 2.2" },
          { icon: "🚨", label: "Breach Response Guide", href: "/breach-notification",
            description: "72-hour notification clock, thresholds, and documentation" },
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

  const renderSubItem = (sub: NavSubItem, mobile = false) => (
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

  return (
    <>
    <nav className="bg-card border-b border-fog sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 md:h-16">
        {/* Logo */}
        <Link to="/" className="no-underline flex items-center">
          <img src="/logo.png" alt="End User Privacy" className="h-10 w-auto" />
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.href ? location.pathname === item.href : false;
            const baseTopClasses = "flex items-center gap-1 px-2 py-2 transition-colors no-underline font-semibold text-[15px]";
            const colorClasses = item.accent
              ? `text-amber-500 hover:text-amber-400 ${isActive ? "underline underline-offset-4" : ""}`
              : "text-slate hover:text-navy";
            return (
              <div
                key={item.label}
                className="relative group"
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {item.href ? (
                  <Link to={item.href} className={`${baseTopClasses} ${colorClasses}`}>
                    {item.label}
                    {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`${baseTopClasses} ${colorClasses} cursor-pointer bg-transparent border-none`}
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
                              <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest uppercase text-slate-light">
                                {section.header}
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
                className="text-[12px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2 rounded-lg no-underline hover:opacity-90 transition-all"
              >
                🧠 My Dashboard
              </Link>
              {!isPremium && (
                <Link
                  to="/subscribe"
                  className="text-[12px] font-semibold text-amber-600 hover:text-amber-700 no-underline transition-colors flex items-center gap-1"
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
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-teal-600 text-teal-50">
                  FREE PLAN
                </span>
              )}
              <UserMenu onSignOut={handleSignOut} />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[12px] font-medium text-slate hover:text-navy no-underline transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-white text-gray-900 border border-gray-200 hover:bg-gray-100 transition-colors no-underline"
              >
                Sign up free
              </Link>
              <Link
                to="/subscribe"
                className="text-[12px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2 rounded-lg no-underline hover:opacity-90 transition-all"
              >
                See Plans →
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-navy bg-transparent border-none cursor-pointer"
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
                            <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest uppercase text-slate-light">
                              {section.header}
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
