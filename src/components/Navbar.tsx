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
      label: string;
      badge?: string;
      badgeGreen?: boolean;
      href: string;
    }[];
  }[];
}

const navItems: NavItem[] = [
  {
    label: "Latest News",
    sections: [
      {
        items: [
          { icon: "🇺🇸", label: "U.S. Federal", href: "/category/us-federal" },
          { icon: "🗺️", label: "U.S. States", href: "/category/us-states" },
          { icon: "🇪🇺", label: "EU & UK", href: "/category/eu-uk" },
          { icon: "🌏", label: "Global", href: "/category/global" },
          { icon: "⚖️", label: "Enforcement Actions", href: "/category/enforcement" },
          { icon: "🤖", label: "AI & Privacy", href: "/category/ai-privacy" },
          { icon: "📡", label: "AdTech", href: "/category/adtech" },
        ],
      },
      {
        header: "Topic Hubs",
        divider: true,
        items: [
          { icon: "🤖", label: "AI Governance", href: "/topics/ai-governance" },
          { icon: "🔓", label: "Data Breaches", href: "/category/enforcement" },
          { icon: "👁️", label: "Biometric Data", href: "/biometric-privacy" },
          { icon: "🌐", label: "Data Transfers", href: "/cross-border-transfers" },
          { icon: "👶", label: "Children's Privacy", href: "/us-state-privacy-laws" },
          { icon: "🍪", label: "AdTech & Consent", href: "/category/adtech" },
        ],
      },
    ],
  },
  {
    label: "Laws & Frameworks",
    wide: true,
    sections: [
      {
        items: [
          { icon: "🗺️", label: "US State Privacy Laws", href: "/us-state-privacy-laws" },
          { icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" },
          { icon: "⚖️", label: "GDPR Enforcement", href: "/gdpr-enforcement" },
          { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { icon: "🏛️", label: "U.S. Federal Privacy Law", href: "/us-federal-privacy-law" },
          { icon: "🏢", label: "U.S. State Authorities", href: "/us-state-privacy-authorities" },
          { icon: "🌍", label: "Global DPA Directory", href: "/global-privacy-authorities" },
          { icon: "📜", label: "Legislation in Progress", href: "/legislation-tracker" },
        ],
      },
      {
        header: "Free Tools",
        divider: true,
        items: [
          { icon: "📊", label: "State Law Comparison", badge: "FREE", badgeGreen: true, href: "/compare/us-states" },
          { icon: "📅", label: "Compliance Calendar", badge: "FREE", badgeGreen: true, href: "/calendar" },
          { icon: "📜", label: "Legislation Tracker", badge: "FREE", badgeGreen: true, href: "/legislation-tracker" },
        ],
      },
    ],
  },
  {
    label: "Intelligence",
    sections: [
      {
        header: "Free Tools",
        items: [
          { icon: "📊", label: "Enforcement Tracker", badge: "LIVE", badgeGreen: true, href: "/enforcement-tracker" },
        ],
      },
      {
        header: "Premium — $20/month",
        divider: true,
        items: [
          { icon: "📋", label: "Weekly Brief", badge: "PRO", href: "/sample-brief" },
          { icon: "📰", label: "Briefings", badge: "PRO", href: "/subscribe" },
          { icon: "🔔", label: "Alerts", badge: "PRO", href: "/subscribe" },
          { icon: "📈", label: "Analysis", badge: "PRO", href: "/subscribe" },
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

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsPremium(data?.is_premium ?? false));
  }, [user]);

  return (
    <nav className="bg-card border-b border-fog sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex items-center justify-between h-14 md:h-16">
        {/* Logo */}
        <Link to="/" className="no-underline flex items-center">
          <img src="/logo.png" alt="End User Privacy" className="h-10 w-auto" />
        </Link>

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
                  <div className={`bg-card border border-fog rounded-xl shadow-eup-md p-2 ${item.wide ? "min-w-[480px] grid grid-cols-2 gap-x-2" : "min-w-[240px]"}`}>
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
                            <span className="text-base">{sub.icon}</span>
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
                className="text-[12px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2 rounded-lg no-underline hover:opacity-90 transition-all"
              >
                🧠 My Dashboard
              </Link>
              {!isPremium && (
                <Link
                  to="/subscribe"
                  className="text-[12px] font-semibold text-amber-600 hover:text-amber-700 no-underline transition-colors flex items-center gap-1"
                >
                  ⭐ Upgrade
                </Link>
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
                          <span>{sub.icon}</span>
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
          <div className="pt-3 border-t border-fog">
            <Link
              to="/subscribe"
              className="block text-center text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2.5 rounded-lg no-underline"
              onClick={() => setMobileOpen(false)}
            >
              See Plans →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
