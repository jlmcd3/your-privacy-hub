import { Link } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const features = [
  "Know what changed before your next board meeting",
  "See every enforcement action — all regulators, all jurisdictions",
  "Brief re-written specifically for your industry every week",
  "Sector-specific action items — not generic advice",
];

const PremiumBanner = () => {
  const { isPremium, isLoading } = usePremiumStatus();
  if (isLoading || isPremium) return null;
  return (
    <section className="py-10 md:py-16 px-4 md:px-8 bg-paper" id="premium">
      <div className="max-w-[1280px] mx-auto">
        <div className="relative bg-gradient-to-br from-navy via-steel to-blue rounded-2xl p-6 md:p-12 overflow-hidden shadow-eup-xl grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">
          <div className="absolute -top-16 right-[200px] w-[300px] h-[300px] rounded-full bg-white/[0.04]" />
          <div className="absolute -bottom-20 -right-10 w-[400px] h-[400px] rounded-full bg-white/[0.03]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-sky mb-3.5">
              ⭐ Premium Intelligence
            </div>
            <h2 className="font-display text-[24px] md:text-[30px] text-white leading-tight mb-3.5">
              The library is free.<br />Intelligence is $20/month.
            </h2>
            <p className="text-[14px] md:text-[15px] text-slate-light leading-relaxed mb-6">
              Browse every regulator and jurisdiction for free, always. Free accounts include a personalized weekly digest filtered to your regions and topics. Premium adds the Intelligence Brief – re-analyzed every Monday for your industry, your jurisdictions, and your compliance priorities.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-7">
              {features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-[13px] text-white/80">
                  <div className="w-4 h-4 rounded-full bg-accent/25 border border-accent/50 flex items-center justify-center text-[10px] text-accent-light flex-shrink-0 mt-0.5">✓</div>
                  {f}
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <Link to="/subscribe" className="px-5 md:px-7 py-3 md:py-3.5 text-sm font-semibold text-navy bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all no-underline inline-flex items-center gap-2">
                Get Premium →
              </Link>
              <Link to="/sample-brief" className="px-5 md:px-6 py-3 md:py-3.5 text-sm font-medium text-white/85 bg-white/[0.08] border border-white/[0.18] rounded-lg hover:bg-white/[0.14] hover:text-white transition-all no-underline inline-flex items-center gap-2">
                See a sample brief →
              </Link>
            </div>
          </div>

          <div className="relative z-10 bg-white/[0.06] border border-white/15 rounded-2xl p-6 md:p-7 text-center min-w-[180px] md:min-w-[200px]">
            <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium</div>
            <div className="font-display text-[44px] md:text-[52px] text-white leading-none">
              <sup className="text-[18px] md:text-[22px] align-super">$</sup>20
            </div>
            <div className="text-[13px] text-slate-light mt-1 mb-1.5">per month · Premium</div>
            <div className="text-[11px] text-sky bg-sky/10 px-2.5 py-1 rounded-full border border-sky/20 inline-block">
              First 25 subscribers: free for 1 year
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PremiumBanner;
