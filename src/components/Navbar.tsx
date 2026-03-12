import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";

interface DropdownItem {
  icon: string;
  label: string;
  badge?: string;
  badgeGreen?: boolean;
  href: string;
}

interface NavDropdown {
  label: string;
  active?: boolean;
  sections: { header?: string; items: DropdownItem[]; divider?: boolean }[];
  wide?: boolean;
}

const navItems: NavDropdown[] = [
  {
    label: "Updates",
    active: true,
    sections: [
      { header: "By Jurisdiction", items: [
        { icon: "🇺🇸", label: "U.S. Federal", badge: "12", href: "/category/us-federal" },
        { icon: "🗺️", label: "U.S. States", badge: "34", href: "/category/us-states" },
        { icon: "🇪🇺", label: "EU & UK", badge: "28", href: "/category/eu-uk" },
        { icon: "🌐", label: "Global", badge: "19", href: "/category/global" },
      ]},
      { header: "By Topic", divider: true, items: [
        { icon: "⚖️", label: "Enforcement Actions", badge: "NEW", badgeGreen: true, href: "/category/enforcement" },
        { icon: "🤖", label: "AI & Privacy", href: "/category/ai-privacy" },
      ]},
    ],
  },
  {
    label: "Jurisdictions",
    wide: true,
    sections: [
      { header: "Americas", items: [
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
        { icon: "🌏", label: "Middle East", href: "/jurisdiction/uae" },
        { icon: "🗂️", label: "All 150+ Jurisdictions →", href: "/global-privacy-authorities" },
      ]},
    ],
  },
  {
    label: "Regulators",
    sections: [
      { header: "Authority Directories", items: [
        { icon: "🏛️", label: "U.S. State Authorities", href: "/us-state-privacy-authorities" },
        { icon: "🌐", label: "Global DPA Directory", href: "/global-privacy-authorities" },
      ]},
      { header: "Key Regulators", divider: true, items: [
        { icon: "⚖️", label: "EDPB (EU)", href: "/regulator/edpb" },
        { icon: "⚖️", label: "ICO (UK)", href: "/regulator/ico" },
        { icon: "⚖️", label: "FTC (U.S.)", href: "/regulator/ftc" },
        { icon: "⚖️", label: "CNIL (France)", href: "/regulator/cnil" },
        { icon: "⚖️", label: "DPC (Ireland)", href: "/regulator/dpc" },
      ]},
      { items: [{ icon: "🗂️", label: "All 250+ Regulators →", href: "/global-privacy-authorities" }], divider: true },
    ],
  },
  {
    label: "Enforcement",
    sections: [
      { items: [
        { icon: "📊", label: "Enforcement Tracker", badge: "LIVE", badgeGreen: true, href: "/enforcement-tracker" },
        { icon: "💰", label: "Largest Fines", href: "/enforcement-tracker" },
        { icon: "🔍", label: "By Regulator", href: "/enforcement-tracker" },
        { icon: "🌍", label: "By Jurisdiction", href: "/enforcement-tracker" },
      ]},
    ],
  },
  {
    label: "Intelligence",
    sections: [
      { header: "Premium", items: [
        { icon: "📋", label: "Weekly Brief", badge: "PRO", href: "/#premium" },
        { icon: "📈", label: "Trend Signals", badge: "PRO", href: "/#premium" },
        { icon: "🔔", label: "Custom Alerts", badge: "PRO", href: "/#premium" },
      ]},
      { header: "Research", divider: true, items: [
        { icon: "📰", label: "U.S. State Privacy Laws", href: "/us-state-privacy-laws" },
        { icon: "📚", label: "GDPR Enforcement", href: "/gdpr-enforcement" },
        { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
        { icon: "🏛️", label: "U.S. Federal Privacy Law", href: "/us-federal-privacy-law" },
        { icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" },
      ]},
    ],
  },
];

const Navbar = () => {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(null);

  return (
    <nav className="bg-card border-b border-fog sticky top-0 z-50 shadow-eup-sm">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex items-center justify-between h-14 md:h-16">
        <Link to="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-steel to-blue rounded-sm flex items-center justify-center text-white text-sm md:text-base font-bold font-display shadow-[0_2px_8px_rgba(59,130,196,0.3)]">
            E
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[15px] md:text-[17px] text-navy tracking-tight">EndUserPrivacy</span>
            <span className="text-[9px] md:text-[10px] font-medium text-slate tracking-widest uppercase">Privacy Intelligence</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-stretch flex-1 list-none gap-0 ml-8">
          {navItems.map((item, idx) => (
            <li
              key={idx}
              className="relative flex items-stretch"
              onMouseEnter={() => setOpenDropdown(idx)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <span className={`flex items-center gap-1 px-3.5 text-[13.5px] font-medium cursor-pointer border-b-2 transition-colors select-none whitespace-nowrap ${
                item.active ? "text-steel border-blue" : "text-slate border-transparent hover:text-steel hover:border-blue"
              }`}>
                {item.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === idx ? "rotate-180" : ""}`} />
              </span>

              {openDropdown === idx && (
                <div className={`absolute top-full left-0 bg-card border border-fog rounded-xl shadow-eup-lg p-2 z-50 ${
                  item.wide ? "min-w-[480px] grid grid-cols-2 gap-x-2 p-3" : "min-w-[240px]"
                }`} style={{ transform: "translateY(1px)" }}>
                  {item.wide ? (
                    <>
                      <div className="flex flex-col">
                        {item.sections.slice(0, 2).map((sec, si) => (
                          <div key={si}>
                            {sec.divider && <div className="h-px bg-fog my-1.5" />}
                            {sec.header && <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-light px-3 pt-2 pb-1">{sec.header}</div>}
                            {sec.items.map((di, dii) => (
                              <Link key={dii} to={di.href} className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-navy rounded-lg hover:bg-fog transition-colors no-underline">
                                <span className="w-7 h-7 bg-fog rounded-sm flex items-center justify-center text-[13px] flex-shrink-0">{di.icon}</span>
                                {di.label}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col">
                        {item.sections.slice(2).map((sec, si) => (
                          <div key={si}>
                            {sec.divider && <div className="h-px bg-fog my-1.5" />}
                            {sec.header && <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-light px-3 pt-2 pb-1">{sec.header}</div>}
                            {sec.items.map((di, dii) => (
                              <Link key={dii} to={di.href} className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-navy rounded-lg hover:bg-fog transition-colors no-underline">
                                <span className="w-7 h-7 bg-fog rounded-sm flex items-center justify-center text-[13px] flex-shrink-0">{di.icon}</span>
                                {di.label}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    item.sections.map((sec, si) => (
                      <div key={si}>
                        {sec.divider && <div className="h-px bg-fog my-1.5" />}
                        {sec.header && <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-light px-3 pt-2 pb-1">{sec.header}</div>}
                        {sec.items.map((di, dii) => (
                          <Link key={dii} to={di.href} className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-navy rounded-lg hover:bg-fog transition-colors no-underline">
                            <span className="w-7 h-7 bg-fog rounded-sm flex items-center justify-center text-[13px] flex-shrink-0 hover:bg-sky transition-colors">{di.icon}</span>
                            <span className="flex-1">{di.label}</span>
                            {di.badge && (
                              <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                di.badgeGreen ? "bg-accent text-white" : "bg-navy text-white"
                              }`}>{di.badge}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <a href="#" className="hidden md:inline-block px-3.5 py-1.5 text-[13px] font-medium text-slate bg-transparent rounded-lg hover:text-steel hover:bg-fog transition-colors no-underline">Sign In</a>
          <Link to="/#premium" className="hidden sm:inline-block px-4 py-2 text-[12px] md:text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 hover:shadow-[0_4px_14px_rgba(59,130,196,0.35)] hover:-translate-y-px transition-all no-underline">
            Get Premium →
          </Link>
          <button
            className="lg:hidden p-2 text-navy hover:bg-fog rounded-lg transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-fog bg-card max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item, idx) => (
              <div key={idx}>
                <button
                  className="w-full flex items-center justify-between py-3 px-3 text-[14px] font-medium text-navy rounded-lg hover:bg-fog transition-colors"
                  onClick={() => setMobileExpanded(mobileExpanded === idx ? null : idx)}
                >
                  {item.label}
                  <ChevronRight className={`w-4 h-4 text-slate transition-transform ${mobileExpanded === idx ? "rotate-90" : ""}`} />
                </button>
                {mobileExpanded === idx && (
                  <div className="pl-3 pb-2">
                    {item.sections.map((sec, si) => (
                      <div key={si}>
                        {sec.header && <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-light px-3 pt-2 pb-1">{sec.header}</div>}
                        {sec.items.map((di, dii) => (
                          <Link
                            key={dii}
                            to={di.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2.5 py-2.5 px-3 text-[13px] text-navy rounded-lg hover:bg-fog transition-colors no-underline"
                          >
                            <span className="w-7 h-7 bg-fog rounded-sm flex items-center justify-center text-[13px] flex-shrink-0">{di.icon}</span>
                            <span className="flex-1">{di.label}</span>
                            {di.badge && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                di.badgeGreen ? "bg-accent text-white" : "bg-navy text-white"
                              }`}>{di.badge}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-fog pt-3 mt-2 flex flex-col gap-2">
              <a href="#" className="py-2.5 px-3 text-[14px] font-medium text-slate rounded-lg hover:bg-fog transition-colors no-underline">Sign In</a>
              <Link to="/#premium" onClick={() => setMobileOpen(false)} className="py-2.5 px-3 text-[14px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg text-center no-underline">
                Get Premium →
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
