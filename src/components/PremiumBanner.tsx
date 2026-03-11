const features = [
  "Full weekly intelligence brief",
  "Complete enforcement database",
  "Cross-jurisdictional trend signals",
  '"Why This Matters" analysis',
  "All 8 brief sections unlocked",
  "No ads, ever",
];

const PremiumBanner = () => {
  return (
    <section className="py-16 px-8 bg-paper" id="premium">
      <div className="max-w-[1280px] mx-auto">
        <div className="relative bg-gradient-to-br from-navy via-steel to-blue rounded-2xl p-12 overflow-hidden shadow-eup-xl grid grid-cols-[1fr_auto] gap-12 items-center">
          {/* Decorative circles */}
          <div className="absolute -top-16 right-[200px] w-[300px] h-[300px] rounded-full bg-white/[0.04]" />
          <div className="absolute -bottom-20 -right-10 w-[400px] h-[400px] rounded-full bg-white/[0.03]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-sky mb-3.5">
              ⭐ Premium Intelligence
            </div>
            <h2 className="font-display text-[30px] text-white leading-tight mb-3.5">
              The complete picture,<br />every week.
            </h2>
            <p className="text-[15px] text-slate-light leading-relaxed mb-6">
              Privacy professionals and compliance teams get structured weekly synthesis, full enforcement database access, trend signals, and cross-jurisdictional analysis — delivered every Monday.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-7">
              {features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-[13px] text-white/80">
                  <div className="w-4.5 h-4.5 rounded-full bg-accent/25 border border-accent/50 flex items-center justify-center text-[10px] text-accent-light flex-shrink-0 mt-0.5">✓</div>
                  {f}
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <a href="#" className="px-7 py-3.5 text-sm font-semibold text-navy bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all no-underline inline-flex items-center gap-2">
                Start Founding Member Plan →
              </a>
              <a href="#" className="px-6 py-3.5 text-sm font-medium text-white/85 bg-white/[0.08] border border-white/[0.18] rounded-lg hover:bg-white/[0.14] hover:text-white transition-all no-underline inline-flex items-center gap-2">
                See what's included
              </a>
            </div>
          </div>

          <div className="relative z-10 bg-white/[0.06] border border-white/15 rounded-2xl p-7 text-center min-w-[200px]">
            <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">🔒 Founding Member Rate</div>
            <div className="font-display text-[52px] text-white leading-none">
              <sup className="text-[22px] align-super">$</sup>12
            </div>
            <div className="text-[13px] text-slate-light mt-1 mb-1.5">per month</div>
            <div className="text-[11px] text-sky bg-sky/10 px-2.5 py-1 rounded-full border border-sky/20 inline-block">First 200 members · Locked forever</div>
            <div className="text-[12px] text-slate-light mt-2 line-through">Regular price: $15/month</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PremiumBanner;
