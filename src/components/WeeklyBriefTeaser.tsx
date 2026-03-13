import { useNavigate } from "react-router-dom";

const sections = [
  { label: "Executive Summary", locked: false },
  { label: "U.S. Federal Analysis", locked: false },
  { label: "U.S. State Analysis", locked: false },
  { label: "EU & UK Analysis", locked: true },
  { label: "Global Developments", locked: true },
  { label: "Enforcement Table", locked: true },
  { label: "Trend Signal", locked: true },
  { label: "Why This Matters", locked: true },
];

const WeeklyBriefTeaser = () => {
  const navigate = useNavigate();

  return (
    <section className="py-10 md:py-16 px-4 md:px-8 bg-card">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8">
          <div>
            <h2 className="font-display text-[22px] md:text-[26px] tracking-tight text-navy">This Week's Intelligence Brief</h2>
            <p className="text-sm text-slate mt-1">Structured synthesis of all developments · Premium subscribers get full access</p>
          </div>
          <button onClick={() => navigate("/subscribe")} className="text-[13px] font-medium text-blue flex items-center gap-1 hover:gap-2 transition-all bg-transparent border-none cursor-pointer">
            Unlock Full Intelligence →
          </button>
        </div>

        <div className="relative bg-gradient-to-br from-[#0A1929] to-navy rounded-2xl p-5 md:p-9 overflow-hidden border border-navy-light">
          <div className="absolute top-6 right-7 text-[10px] font-bold tracking-[0.12em] text-slate hidden md:block">WEEK 10 · 2026</div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2.5 flex items-center gap-1.5">📋 Weekly Intelligence Brief</div>
          <h3 className="font-display text-[18px] md:text-[22px] text-white mb-4">
            EDPB AI guidance, Texas TDPSA first enforcement, and a coordinated data broker crackdown signal a pivotal week for global privacy compliance
          </h3>
          <p className="text-[13px] md:text-[13.5px] text-slate-light leading-relaxed mb-5 max-h-20 overflow-hidden" style={{
            maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          }}>
            The week of March 3–10, 2026 saw three concurrent enforcement actions across the EU, United States, and Brazil targeting data brokers — the highest frequency of coordinated cross-jurisdictional broker enforcement since 2022. The EDPB's binding guidance on AI training data establishes a compliance standard that will require immediate review of data acquisition practices at any company training or fine-tuning large language models on EU personal data…
          </p>
          <div className="relative rounded-xl border border-white/10 overflow-hidden mb-4">
            {/* Blurred content rows */}
            <div className="px-4 py-4 space-y-3 blur-sm select-none pointer-events-none">
              <div className="text-[10px] font-bold tracking-widest uppercase text-sky/60">EU & UK Analysis</div>
              <div className="h-2.5 bg-white/10 rounded w-full" />
              <div className="h-2.5 bg-white/10 rounded w-4/5" />
              <div className="h-2.5 bg-white/10 rounded w-3/4 mt-3" />
              <div className="text-[10px] font-bold tracking-widest uppercase text-sky/60 mt-3">Trend Signal</div>
              <div className="h-2.5 bg-white/10 rounded w-full" />
              <div className="h-2.5 bg-white/10 rounded w-2/3" />
            </div>
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-navy/60 backdrop-blur-[2px]">
              <div className="text-center px-4">
                <div className="text-[11px] font-semibold text-white/80 mb-2">
                  🔒 5 more sections — Premium only
                </div>
                <div className="text-[10.5px] text-white/50">
                  EU & UK · Global · Enforcement Table · Trend Signal · Why This Matters
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {sections.filter(s => !s.locked).map((s) => (
              <span
                key={s.label}
                className="text-[10px] md:text-[11px] font-medium px-2 md:px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/15 text-white/80"
              >
                {s.label}
              </span>
            ))}
            <span className="text-[10px] md:text-[11px] font-medium px-2 md:px-2.5 py-1 rounded-full bg-sky/10 border border-sky/25 text-sky/80">
              🔒 +5 Premium sections
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
            <span className="text-[12px] text-slate">12 regulatory updates · 8 sections · Published every Monday</span>
            <button onClick={() => navigate("/subscribe")} className="px-4 py-2 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 transition-all border-none cursor-pointer">
              Read Full Brief →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeeklyBriefTeaser;
