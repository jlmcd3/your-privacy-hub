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
    label: "Updates",
    sections: [
      {
        items: [
          { icon: "🇺🇸", label: "U.S. Federal", href: "/category/us-federal" },
          { icon: "🗺️", label: "U.S. States", href: "/category/us-states" },
          { icon: "🇪🇺", label: "EU & UK", href: "/category/eu-uk" },
          { icon: "🌏", label: "Global", href: "/category/global" },
        ],
      },
      {
        header: "By Topic",
        divider: true,
        items: [
          { icon: "📊", label: "Enforcement Tracker", badge: "LIVE", badgeGreen: true, href: "/enforcement-tracker" },
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
          { icon: "🔓", label: "Data Breaches", href: "/topics/data-breaches" },
          { icon: "👁️", label: "Biometric Data", href: "/topics/biometric-data" },
          { icon: "🌐", label: "Data Transfers", href: "/topics/data-transfers" },
          { icon: "👶", label: "Children's Privacy", href: "/topics/children-privacy" },
          { icon: "🍪", label: "AdTech & Consent", href: "/topics/adtech" },
        ],
      },
    ],
  },
  {
    label: "Jurisdictions",
    href: "/jurisdictions",
    wide: true,
    sections: [
      { header: "Americas", items: [
        { icon: "🗺️", label: "Interactive Map", href: "/jurisdictions", badge: "NEW", badgeGreen: true },
        { icon: "🇺🇸", label: "United States", href: "/jurisdiction/united-states" },
        { icon: "🇨🇦", label: "Canada", href: "/jurisdiction/canada" },
        { icon: "🇧🇷", label: "Brazil", href: "/jurisdiction/brazil" },
        { icon: "🇲🇽", label: "Mexico", href: "/jurisdiction/mexico" },
      ]},
      { header: "Asia-Pacific", divider: true, items: [
        { icon: "🇦🇺", label: "Australia", href: "/jurisdiction/australia" },
        { icon: "🇯🇵", label: "Japan", href: "/jurisdiction/japan" },
        { icon: "🇸🇬", label: "Singapore", href: "/jurisdiction/singapore" },
        { icon: "🇰🇷", label: "South Korea", href: "/jurisdiction/south-korea" },
      ]},
      { header: "Europe", items: [
        { icon: "🇪🇺", label: "European Union", href: "/jurisdiction/european-union" },
        { icon: "🇬🇧", label: "United Kingdom", href: "/jurisdiction/united-kingdom" },
        { icon: "🇩🇪", label: "Germany", href: "/jurisdiction/germany" },
        { icon: "🇫🇷", label: "France", href: "/jurisdiction/france" },
      ]},
      { header: "Other", divider: true, items: [
        { icon: "🌍", label: "Africa", href: "/jurisdiction/south-africa" },
        { icon: "🌏", label: "Middle East", href: "/jurisdiction/united-arab-emirates" },
        { icon: "🗂️", label: "All 150+ Jurisdictions →", href: "/global-privacy-authorities" },
      ]},
      { header: "Key Regulators", divider: true, items: [
        { icon: "⚖️", label: "EDPB (EU)", href: "/regulator/edpb" },
        { icon: "⚖️", label: "ICO (UK)", href: "/regulator/ico" },
        { icon: "⚖️", label: "FTC (U.S.)", href: "/regulator/ftc" },
        { icon: "🏛️", label: "U.S. State Authorities", href: "/us-state-privacy-authorities" },
        { icon: "🌐", label: "All 119 Regulators →", href: "/global-privacy-authorities" },
      ]},
    ],
  },


  {
    label: "Intelligence",
    sections: [
      {
        header: "Premium",
        items: [
          { icon: "📋", label: "Weekly Brief", badge: "PRO", href: "/sample-brief" },
          { icon: "📈", label: "Trend Signals", badge: "SOON", href: "/subscribe" },
          { icon: "🔔", label: "Custom Alerts", badge: "SOON", href: "/subscribe" },
        ],
      },
      {
        header: "Analysis Tools",
        divider: true,
        items: [
          { icon: "🧰", label: "Professional Toolkit", href: "/tools" },
          { icon: "📊", label: "US State Comparison", href: "/compare/us-states" },
          { icon: "🌐", label: "Compare Jurisdictions", href: "/compare/jurisdictions" },

          { icon: "📜", label: "Legislation Tracker", badge: "NEW", badgeGreen: true, href: "/legislation-tracker" },
          { icon: "⏱️", label: "Regulatory Timelines", href: "/timelines" },
          { icon: "📅", label: "Compliance Calendar", href: "/calendar" },
        ],
      },
      {
        header: "Reference",
        divider: true,
        items: [
          { icon: "📖", label: "Privacy Glossary", href: "/glossary" },
          { icon: "🗺️", label: "US State Privacy Laws", href: "/us-state-privacy-laws" },
          { icon: "⚖️", label: "GDPR Enforcement", href: "/gdpr-enforcement" },
          { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { icon: "🏛️", label: "U.S. Federal Privacy Law", href: "/us-federal-privacy-law" },
          { icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" },
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
                  className="flex items-center gap-1 px-3 py-2 text-[13px] font-medium transition-colors text-slate hover:text-navy no-underline"
                >
                  {item.label}
                  {item.sections && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                </Link>
              ) : (
                <button
                  className="flex items-center gap-1 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer bg-transparent border-none text-slate hover:text-navy"
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
