import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-mid to-navy-light text-white py-20 px-8">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_20%,rgba(59,130,196,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_50%_at_10%_80%,rgba(29,158,111,0.10)_0%,transparent_50%)]" />
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px"
      }} />

      <div className="max-w-[1280px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-5 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            <span>🌐</span> Global Privacy Intelligence Platform
          </div>
          <h1 className="font-display text-[clamp(36px,4vw,52px)] leading-[1.1] tracking-tight mb-5">
            Every privacy regulator.<br />
            <em className="italic text-sky">One platform.</em>
          </h1>
          <p className="text-base text-slate-light leading-relaxed max-w-[520px] mb-9">
            Track regulatory developments from 250+ privacy authorities across 150+ jurisdictions — automatically monitored, AI-summarized, and structured for professionals.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <Link to="/global-privacy-authorities" className="px-7 py-3.5 text-sm font-semibold text-navy bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all no-underline inline-flex items-center gap-2">
              🔍 Browse Regulators
            </Link>
            <a href="#premium" className="px-6 py-3.5 text-sm font-medium text-white/85 bg-white/[0.08] border border-white/[0.18] rounded-lg hover:bg-white/[0.14] hover:text-white transition-all no-underline inline-flex items-center gap-2">
              View Premium Plans →
            </a>
          </div>

          <div className="flex gap-7 mt-11 pt-8 border-t border-white/10">
            {[
              { num: "250+", label: "Regulators monitored" },
              { num: "150+", label: "Jurisdictions covered" },
              { num: "Daily", label: "Automated updates" },
              { num: "$0", label: "To start browsing" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-7">
                {i > 0 && <div className="w-px h-10 bg-white/10 -ml-7 mr-0" />}
                <div>
                  <div className="font-display text-[28px] leading-none">{stat.num}</div>
                  <div className="text-[11px] font-medium text-slate-light mt-1 tracking-wide">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Premium card preview */}
        <div className="bg-white/[0.06] border border-white/[0.12] rounded-2xl p-7 backdrop-blur-xl animate-fade-up" style={{ animationDelay: "0.12s" }}>
          <div className="flex justify-between items-start mb-5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-sky bg-sky/15 px-2.5 py-1 rounded-full border border-sky/25">⭐ Premium Brief</span>
            <span className="text-[11px] text-slate-light">Week of Mar 3, 2026</span>
          </div>
          <h3 className="font-display text-[17px] text-white mb-4 leading-snug">
            EDPB issues binding guidance on AI training data; Texas AG opens first TDPSA enforcement
          </h3>
          <div className="bg-white/5 rounded-lg p-3 mb-2 border-l-2 border-sky/40 hover:border-sky transition-colors">
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-light mb-1">Executive Summary</div>
            <div className="text-[12.5px] text-white/75 leading-relaxed">
              This week's most consequential developments span AI data processing and state-level enforcement escalation. The EDPB issued binding guidance restricting use of personal data for large language model training without explicit consent…
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border-l-2 border-sky/40 relative overflow-hidden">
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-light mb-1">Trend Signal</div>
            <div className="text-[12.5px] text-white/75 leading-relaxed">
              Three enforcement actions across EU, U.S., and Brazil this week point to coordinated regulatory pressure on data brokers — a pattern not observed at this frequency since 2022…
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-navy-mid/95 to-transparent" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-slate-light">Full brief: 8 sections · 12 updates</span>
            <a href="#premium" className="text-[12px] font-semibold text-navy bg-sky px-4 py-1.5 rounded-lg hover:bg-white transition-colors no-underline">Unlock →</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
