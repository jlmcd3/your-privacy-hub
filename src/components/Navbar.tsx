import { useState } from "react";
import { Link } from "react-router-dom";

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
        { icon: "🇺🇸", label: "U.S. Federal", badge: "12", href: "#" },
        { icon: "🗺️", label: "U.S. States", badge: "34", href: "#" },
        { icon: "🇪🇺", label: "EU & UK", badge: "28", href: "#" },
        { icon: "🌐", label: "Global", badge: "19", href: "#" },
      ]},
      { header: "By Topic", divider: true, items: [
        { icon: "⚖️", label: "Enforcement Actions", badge: "NEW", badgeGreen: true, href: "#" },
        { icon: "🤖", label: "AI & Privacy", href: "#" },
      ]},
    ],
  },
  {
    label: "Jurisdictions",
    wide: true,
    sections: [
      { header: "Americas", items: [
        { icon: "🇺🇸", label: "United States", href: "#" },
        { icon: "🇨🇦", label: "Canada", href: "#" },
        { icon: "🇧🇷", label: "Brazil", href: "#" },
        { icon: "🇲🇽", label: "Mexico", href: "#" },
      ]},
      { header: "Asia-Pacific", divider: true, items: [
        { icon: "🇦🇺", label: "Australia", href: "#" },
        { icon: "🇯🇵", label: "Japan", href: "#" },
        { icon: "🇸🇬", label: "Singapore", href: "#" },
        { icon: "🇰🇷", label: "South Korea", href: "#" },
      ]},
      { header: "Europe", items: [
        { icon: "🇪🇺", label: "European Union", href: "#" },
        { icon: "🇬🇧", label: "United Kingdom", href: "#" },
        { icon: "🇩🇪", label: "Germany", href: "#" },
        { icon: "🇫🇷", label: "France", href: "#" },
      ]},
      { header: "Other", divider: true, items: [
        { icon: "🌍", label: "Africa", href: "#" },
        { icon: "🌏", label: "Middle East", href: "#" },
        { icon: "🗂️", label: "All 150+ Jurisdictions →", href: "#" },
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
        { icon: "⚖️", label: "EDPB (EU)", href: "#" },
        { icon: "⚖️", label: "ICO (UK)", href: "#" },
        { icon: "⚖️", label: "FTC (U.S.)", href: "#" },
        { icon: "⚖️", label: "CNIL (France)", href: "#" },
        { icon: "⚖️", label: "DPC (Ireland)", href: "#" },
      ]},
      { items: [{ icon: "🗂️", label: "All 250+ Regulators →", href: "#" }], divider: true },
    ],
  },
  {
    label: "Enforcement",
    sections: [
      { items: [
        { icon: "📊", label: "Enforcement Tracker", badge: "LIVE", badgeGreen: true, href: "/enforcement-tracker" },
        { icon: "💰", label: "Largest Fines", href: "#" },
        { icon: "🔍", label: "By Regulator", href: "#" },
        { icon: "🌍", label: "By Jurisdiction", href: "#" },
      ]},
    ],
  },
  {
    label: "Intelligence",
    sections: [
      { header: "Premium", items: [
        { icon: "📋", label: "Weekly Brief", badge: "PRO", href: "#" },
        { icon: "📈", label: "Trend Signals", badge: "PRO", href: "#" },
        { icon: "🔔", label: "Custom Alerts", badge: "PRO", href: "#" },
      ]},
      { header: "Free", divider: true, items: [
        { icon: "📰", label: "This Week's Teaser", href: "#" },
        { icon: "📚", label: "Research Topics", href: "#" },
      ]},
    ],
  },
];

const Navbar = () => {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  return (
    <nav className="bg-card border-b border-fog sticky top-0 z-50 shadow-eup-sm">
      <div className="max-w-[1280px] mx-auto px-8 flex items-stretch h-16">
        <Link to="/" className="flex items-center gap-2.5 mr-8 no-underline flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-steel to-blue rounded-sm flex items-center justify-center text-white text-base font-bold font-display shadow-[0_2px_8px_rgba(59,130,196,0.3)]">
            E
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[17px] text-navy tracking-tight">EndUserPrivacy</span>
            <span className="text-[10px] font-medium text-slate tracking-widest uppercase">Privacy Intelligence</span>
          </div>
        </Link>

        <ul className="flex items-stretch flex-1 list-none gap-0">
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
                <span className={`text-[9px] ml-0.5 transition-transform ${openDropdown === idx ? "rotate-180" : ""}`}>▾</span>
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

        <div className="flex items-center gap-2.5 ml-auto">
          <a href="#" className="px-3.5 py-1.5 text-[13px] font-medium text-slate bg-transparent rounded-lg hover:text-steel hover:bg-fog transition-colors no-underline">Sign In</a>
          <Link to="/#premium" className="px-4 py-2 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 hover:shadow-[0_4px_14px_rgba(59,130,196,0.35)] hover:-translate-y-px transition-all no-underline">
            Get Premium →
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
