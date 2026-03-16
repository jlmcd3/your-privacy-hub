import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-navy text-slate-light pt-14 pb-8 px-4 md:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[280px_1fr_1fr_1fr_1fr] gap-8 lg:gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-steel to-blue rounded-sm flex items-center justify-center text-white text-[13px] font-bold font-display">E</div>
              <span className="font-display text-[15px] text-white">EndUserPrivacy</span>
            </div>
            <p className="text-[13px] leading-relaxed mb-5">
              Global privacy regulatory intelligence for professionals. Monitoring 250+ authorities across 150+ jurisdictions, automatically.
            </p>
            <div className="flex gap-2">
              <a href="#" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-slate-light text-[13px] hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                in
              </a>
              <a href="#" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-slate-light text-[13px] hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                𝕏
              </a>
              <a href="mailto:contact@enduserprivacy.com" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-slate-light hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Regulatory Updates</h4>
            {[
              { label: "All Updates", href: "/updates" },
              { label: "U.S. Federal", href: "/category/us-federal" },
              { label: "U.S. States", href: "/category/us-states" },
              { label: "EU & UK", href: "/category/eu-uk" },
              { label: "Global", href: "/category/global" },
              { label: "Enforcement", href: "/category/enforcement" },
              { label: "AI & Privacy", href: "/category/ai-privacy" },
            ].map((l) => (
              <Link key={l.label} to={l.href} className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">{l.label}</Link>
            ))}
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Directories</h4>
            <Link to="/us-state-privacy-authorities" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">U.S. State Authorities</Link>
            <Link to="/global-privacy-authorities" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Global DPA Directory</Link>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Research</h4>
            {[
              { label: "U.S. State Privacy Laws", href: "/us-state-privacy-laws" },
              { label: "GDPR Enforcement", href: "/gdpr-enforcement" },
              { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
              { label: "U.S. Federal Privacy Law", href: "/us-federal-privacy-law" },
              { label: "Global Privacy Laws", href: "/global-privacy-laws" },
            ].map((l) => (
              <Link key={l.label} to={l.href} className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">{l.label}</Link>
            ))}
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Intelligence</h4>
            <Link to="/subscribe" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Weekly Brief</Link>
            <Link to="/enforcement-tracker" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Enforcement Tracker</Link>
            <Link to="/subscribe" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Subscribe</Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-6 border-t border-navy-light text-[12px]">
          <div>© 2026 EndUserPrivacy · enduserprivacy.com</div>
          <div className="flex gap-4 items-center flex-wrap justify-center">
            <Link to="/terms" className="text-slate-light hover:text-silver no-underline">Terms</Link>
            <span className="hidden md:inline text-navy-light">·</span>
            <Link to="/privacy-policy" className="text-slate-light hover:text-silver no-underline">Privacy Policy</Link>
            <span className="hidden md:inline text-navy-light">·</span>
            <span className="text-center">Summaries are AI-generated. Verify against primary sources.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
