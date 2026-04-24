import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  label: string;
  href?: string;
  wide?: boolean;
  sections?: {
    header?: string;
    divider?: boolean;
    items: {
      icon: string;
      iconImage?: string;
      label: string;
      badge?: string;
      badgeGreen?: boolean;
      href: string;
    }[];
  }[];
}

const navItems: NavItem[] = [
  {
    label: "Intelligence",
    wide: true,
    sections: [
      {
        header: "Free Tools",
        items: [
          { icon: "📋", label: "Your free intelligence brief", href: "/subscribe" },
          { icon: "📰", label: "Browse updates", badge: "FREE", badgeGreen: true, href: "/updates" },
          { icon: "📊", label: "Enforcement Tracker", badge: "LIVE", badgeGreen: true, href: "/enforcement-tracker" },
          { icon: "🗺️", label: "Interactive Map", badge: "FREE", badgeGreen: true, href: "/jurisdictions" },
          { icon: "📋", label: "Legitimate Interest Tracker", badge: "FREE", badgeGreen: true, href: "/legitimate-interest-tracker" },
          { icon: "📊", label: "State Law Comparison", badge: "FREE", badgeGreen: true, href: "/compare/us-states" },
          { icon: "📅", label: "Compliance Calendar", badge: "FREE", badgeGreen: true, href: "/calendar" },
        ],
      },
      {
        header: "Professional Tools",
        items: [
          { icon: "⭐", label: "Weekly Intelligence Brief", badge: "PRO", href: "/get-intelligence" },
          { icon: "🛰️", label: "Enforcement Forecast Intelligence", badge: "PRO", href: "/horizon" },
          { icon: "🗄️", label: "Enforcement Tracker — Full Archive", badge: "PRO", href: "/enforcement?view=archive" },
          { icon: "📂", label: "Your Registration Filings", badge: "PRO", href: "/registration-manager" },
          { icon: "⚖️", label: "Legitimate Interest Assessment Tool", badge: "PRO", href: "/li-assessment" },
          { icon: "🛡️", label: "Privacy Program Assessment Tool", badge: "PRO", href: "/governance-assessment" },
          { icon: "📑", label: "Impact Assessment Builder", badge: "PRO", href: "/dpia-framework" },
          { icon: "📝", label: "Your Custom DPA", badge: "PRO", href: "/dpa-generator" },
          { icon: "🚨", label: "Your Breach Response Playbook", badge: "PRO", href: "/ir-playbook" },
          { icon: "👁️", label: "Biometric Compliance Checker", badge: "PRO", href: "/biometric-checker" },
        ],
      },
    ],
  },
  {
    label: "Updates",
    sections: [
      {
        header: "Browse by region",
        items: [
          { icon: "🇺🇸", label: "U.S. Federal", href: "/updates?region=us-federal" },
          { icon: "🗺️", label: "U.S. States", href: "/updates?region=us-states" },
          { icon: "🇪🇺", label: "EU & UK", href: "/updates?region=eu-uk" },
          { icon: "🌐", label: "Global", href: "/updates?region=global" },
        ],
      },
      {
        header: "Browse by topic",
        divider: true,
        items: [
          { icon: "🤖", label: "AI & Privacy", href: "/updates?topic=ai-privacy" },
          { icon: "⚖️", label: "Breaches & Enforcement", href: "/updates?topic=enforcement" },
          { icon: "📱", label: "AdTech & Consent", href: "/updates?topic=adtech" },
          { icon: "👤", label: "Biometric Data", href: "/updates?topic=biometric-data" },
          { icon: "🌐", label: "Data Transfers", href: "/updates?topic=cross-border" },
          { icon: "🧒", label: "Children's Privacy", href: "/updates?topic=children-privacy" },
        ],
      },
    ],
  },
  {
    label: "Laws & Frameworks",
    sections: [
      {
        items: [
          { icon: "", iconImage: "/us-flag.svg", label: "U.S. Privacy Laws", href: "/us-privacy-laws" },
          { icon: "🏛️", label: "U.S. State Authorities", href: "/us-state-privacy-authorities" },
          { icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" },
          { icon: "⚖️", label: "GDPR & UK", href: "/gdpr-enforcement" },
          { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { icon: "🌍", label: "Global Privacy Authorities", href: "/global-privacy-authorities" },
          { icon: "📜", label: "Legislation in Progress", href: "/legislation-tracker" },
          { icon: "🔄", label: "Cross-Border Transfers Guide", href: "/cross-border-transfers" },
          { icon: "👁️", label: "Biometric Privacy Guide", href: "/biometric-privacy" },
          { icon: "🏥", label: "Health Data Privacy Guide", href: "/health-data-privacy" },
          { icon: "🚨", label: "Breach Response Guide", href: "/breach-notification" },
        ],
      },
    ],
  },
];
const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [briefLabel, setBriefLabel] = useState<string | null>(null);

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

  return (
    <nav className="bg-card border-b border-fog sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 md:h-16">
        {/* Logo */}
        <Link to="/" className="no-underline flex items-center">
          <img src="/logo.png" alt="End User Privacy" className="h-10 w-auto" />
        </Link>
        {briefLabel && (
          <Link
            to="/dashboard"
            className="hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 ml-3 no-underline hover:bg-amber-100 transition-colors"
          >
            ⭐ {briefLabel}
          </Link>
        )}

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative group"
              onMouseEnter={() => setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {item.href ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1 px-3 py-2 transition-colors text-slate hover:text-navy no-underline font-semibold text-base"
                >
                  {item.label}
                  {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                </Link>
              ) : (
                <button
                  className="flex items-center gap-1 px-3 py-2 transition-colors cursor-pointer bg-transparent border-none text-slate hover:text-navy text-base font-semibold"
                >
                  {item.label}
                  {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              )}

              {item.sections && openDropdown === item.label && (
                <div className="absolute top-full left-0 pt-1 z-50">
                  <div className={`bg-card border border-fog rounded-xl shadow-eup-md p-2 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain ${item.wide ? "min-w-[480px] grid grid-cols-2 gap-x-2" : "min-w-[240px]"}`}>
                    {item.sections.map((section, si) => (
                      <div key={si}>
                        {section.divider && !item.wide && <div className="border-t border-fog my-1.5" />}
                        {section.header && (
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest uppercase text-slate-light">
                            {section.header}
                          </div>
                        )}
                        {section.items.map((sub) => (
                          <Link
                            key={sub.label}
                            to={sub.href}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {sub.iconImage ? (
                              <img src={sub.iconImage} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                            ) : (
                              <span className="text-base">{sub.icon}</span>
                            )}
                            <span className="flex-1 font-medium">{sub.label}</span>
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
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
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
                  ⭐ Go Professional
                </Link>
              )}
              {isPremium ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-700 text-purple-100">
                  Pro
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-teal-600 text-teal-50">
                  FREE PLAN
                </span>
              )}
              <Link
                to="/account"
                className="text-[12px] font-medium text-slate hover:text-navy no-underline transition-colors"
              >
                Account
              </Link>
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
                      {section.items.map((sub) => (
                        <Link
                          key={sub.label}
                          to={sub.href}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy"
                          onClick={() => setMobileOpen(false)}
                        >
                          {sub.iconImage ? (
                            <img src={sub.iconImage} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                          ) : (
                            <span>{sub.icon}</span>
                          )}
                          <span className="flex-1">{sub.label}</span>
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
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
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
                    ⭐ Go Professional
                  </Link>
                )}
                <Link
                  to="/account"
                  className="block text-center text-[13px] font-medium text-slate border border-fog px-4 py-2.5 rounded-lg no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Account
                </Link>
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
  );
};

export default Navbar;
