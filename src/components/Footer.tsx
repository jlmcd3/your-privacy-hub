import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-navy text-slate-light pt-14 pb-8 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-[280px_1fr_1fr_1fr] gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-steel to-blue rounded-sm flex items-center justify-center text-white text-[13px] font-bold font-display">E</div>
              <span className="font-display text-[15px] text-white">EndUserPrivacy</span>
            </div>
            <p className="text-[13px] leading-relaxed mb-5">
              Global privacy regulatory intelligence for professionals. Monitoring 250+ authorities across 150+ jurisdictions, automatically.
            </p>
            <div className="flex gap-2">
              {["in", "𝕏", "@"].map((s) => (
                <a key={s} href="#" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-slate-light text-[13px] hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Regulatory Updates</h4>
            {["U.S. Federal", "U.S. States", "EU & UK", "Global", "Enforcement", "AI & Privacy"].map((l) => (
              <a key={l} href="#" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">{l}</a>
            ))}
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Directories</h4>
            <Link to="/us-state-privacy-authorities" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">U.S. State Authorities</Link>
            <Link to="/global-privacy-authorities" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Global DPA Directory</Link>
            <Link to="/enforcement-tracker" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Enforcement Tracker</Link>
            <a href="#" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Jurisdiction Pages</a>
            <a href="#" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">Regulator Pages</a>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Platform</h4>
            {["Research Topics", "Weekly Brief", "Premium Plans", "About", "Privacy Policy", "Terms of Service"].map((l) => (
              <a key={l} href="#" className="block text-[13px] text-slate-light mb-2 hover:text-white transition-colors no-underline">{l}</a>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-navy-light text-[12px]">
          <div>© 2026 EndUserPrivacy · enduserprivacy.com</div>
          <div className="flex gap-4 items-center">
            <a href="#" className="text-slate-light hover:text-silver no-underline">Privacy Policy</a>
            <a href="#" className="text-slate-light hover:text-silver no-underline">Terms</a>
            <a href="#" className="text-slate-light hover:text-silver no-underline">Disclaimer</a>
            <span className="text-navy-light">·</span>
            <span>Summaries are AI-generated. Verify against primary sources.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
