import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useConversionEvent } from "@/hooks/useConversionEvent";

const Footer = () => {
  const fireConversion = useConversionEvent();
  return (
    <footer className="bg-brand-navy text-brand-mist pt-14 pb-8 px-4 md:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] gap-8 lg:gap-12 mb-12">
          <div>
            <Link to="/" aria-label="End User Privacy — Home" className="inline-flex items-center mb-3 no-underline">
              <img src="/brand/logo-dark.svg" alt="End User Privacy" width={280} height={52} className="h-10 w-auto shrink-0 object-contain" />
            </Link>
            <p className="text-sm leading-relaxed mb-5 max-w-[380px]">
              Global privacy regulatory intelligence for professionals. Monitoring privacy authorities across the world, automatically.
            </p>
            <div className="flex gap-2">
              <a href="https://www.linkedin.com/company/enduserprivacy" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-brand-mist text-sm hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                in
              </a>
              <a href="https://x.com/enduserprivacy" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-brand-mist text-sm hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                𝕏
              </a>
              <Link to="/contact" aria-label="Contact End User Privacy" className="w-8 h-8 bg-white/[0.06] border border-white/10 rounded-sm flex items-center justify-center text-brand-mist hover:bg-white/[0.12] hover:text-white transition-all no-underline">
                <Mail className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Product</h4>
            {[
              { label: "Newsfeed", href: "/updates" },
              { label: "Compliance Tools", href: "/tools" },
              { label: "Sample Reports", href: "/samples" },
              { label: "Pricing", href: "/subscribe" },
              { label: "Sample Intelligence Report", href: "/#brief" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={
                  l.href === "/subscribe"
                    ? () => fireConversion("subscribe_cta_click", { cta_label: l.label, cta_position: "page-footer" })
                    : undefined
                }
                className="block text-sm text-brand-mist mb-2 hover:text-white transition-colors no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.09em] uppercase text-silver mb-3.5">Company</h4>
            {[
              { label: "About", href: "/about" },
              { label: "FAQ", href: "/faq" },
              { label: "Enforcement Tracker", href: "/enforcement" },
            ].map((l) => (
              <Link key={l.label} to={l.href} className="block text-sm text-brand-mist mb-2 hover:text-white transition-colors no-underline">{l.label}</Link>
            ))}
            <Link to="/contact" className="block text-sm text-brand-mist mb-2 hover:text-white transition-colors no-underline">Contact</Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-6 border-t border-brand-slate-teal text-[12px]">
          <div>© 2026 EUP, LLC. End User Privacy · enduserprivacy.com</div>
          <div className="flex gap-4 items-center flex-wrap justify-center">
            <Link to="/terms" className="text-brand-mist hover:text-silver no-underline">Terms</Link>
            <span className="hidden md:inline text-brand-slate-teal">·</span>
            <Link to="/privacy-policy" className="text-brand-mist hover:text-silver no-underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
