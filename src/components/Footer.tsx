import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-navy text-slate-light pt-14 pb-8 px-4 md:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[220px_1fr_1fr_1fr_1fr_1fr] gap-8 lg:gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/logo.png" alt="End User Privacy" className="h-7 w-auto" />
              <span className="font-display font-bold text-white text-[15px]">End User Privacy</span>
            </div>
            <p className="text-sm leading-relaxed mb-5">
              Global privacy regulatory intelligence for professionals. Monitoring 119 authorities across 150+ jurisdictions, automatically.
            </p>
            <div className="flex gap-2">
              <a href="https://www.linkedin.com/company/enduserprivacy" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-slate-light text-sm hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                in
              </a>
              <a href="https://x.com/enduserprivacy" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-slate-light text-sm hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                𝕏
              </a>
              <a href="mailto:contact@enduserprivacy.com" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-slate-light hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Privacy Intelligence Feed</h4>
            {[
              { label: "All Updates", href: "/updates" },
              { label: "U.S. Federal", href: "/category/us-federal" },
              { label: "U.S. States", href: "/category/us-states" },
              { label: "EU & UK", href: "/category/eu-uk" },
              { label: "Global", href: "/category/global" },
              { label: "Enforcement", href: "/category/enforcement" },
              { label: "AI & Privacy", href: "/category/ai-privacy" },
            ].map((l) => (
              <Link key={l.label} to={l.href} className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">{l.label}</Link>
            ))}
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Directories</h4>
            <Link to="/us-privacy-laws#state-authorities" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">U.S. State Authorities</Link>
            <Link to="/global-privacy-authorities" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">Global DPA Directory</Link>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Research</h4>
            {[
              { label: "U.S. Privacy Laws", href: "/us-privacy-laws" },
              { label: "GDPR & UK", href: "/gdpr-enforcement" },
              { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
              { label: "Global Privacy Laws", href: "/global-privacy-laws" },
            ].map((l) => (
              <Link key={l.label} to={l.href} className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">{l.label}</Link>
            ))}
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Intelligence</h4>
            <Link to="/about" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">About</Link>
            <Link to="/subscribe" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">Intelligence Plan</Link>
            <Link to="/horizon" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">Enforcement Forecast Intelligence</Link>
            <Link to="/enforcement" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">Enforcement Tracker</Link>
            <Link to="/faq" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">FAQ</Link>
            <Link to="/#brief" className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">Sample Privacy Intelligence Report</Link>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Compliance Tools</h4>
            <Link to="/tools" className="block text-sm font-semibold text-white mb-3 hover:text-amber-300 transition-colors no-underline">
              See all tools →
            </Link>
            {[
              { label: "Privacy Programme Assessment", href: "/governance-assessment" },
              { label: "Legitimate Interest Assessment", href: "/li-assessment" },
              { label: "Impact Assessment (DPIA)", href: "/dpia-framework" },
              { label: "DPA Generator", href: "/dpa-generator" },
              { label: "IR Playbook", href: "/ir-playbook" },
              { label: "RoPA Builder", href: "/ropa-builder" },
              { label: "US Privacy Notice", href: "/us-notices" },
              { label: "EU/UK Privacy Notice", href: "/eu-notices" },
              { label: "CPPA Scope Checker", href: "/cppa-scope-checker" },
              { label: "Registration Manager", href: "/registration-manager" },
            ].map((l) => (
              <Link key={l.label} to={l.href} className="block text-sm text-slate-light mb-2 hover:text-white transition-colors no-underline">{l.label}</Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-6 border-t border-navy-light text-[12px]">
          <div>© 2026 End User Privacy · enduserprivacy.com</div>
          <div className="flex gap-4 items-center flex-wrap justify-center">
            <Link to="/terms" className="text-slate-light hover:text-silver no-underline">Terms</Link>
            <span className="hidden md:inline text-navy-light">·</span>
            <Link to="/privacy-policy" className="text-slate-light hover:text-silver no-underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
