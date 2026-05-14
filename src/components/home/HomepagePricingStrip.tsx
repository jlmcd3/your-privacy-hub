import { Link } from "react-router-dom";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

export default function HomepagePricingStrip() {
  return (
    <section className="bg-navy py-9 px-4">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gold mb-2">
            Subscription options
          </p>
          <h2 className="font-display text-[24px] font-bold text-white leading-tight">
            Intelligence only, or the full Compliance Platform
          </h2>
          <p className="text-[13px] text-blue-100/80 mt-2">
            Intelligence Feed from {INTELLIGENCE_PRICING.monthly()} · Annual Platform at {PLATFORM_PRICING.standard()}.
          </p>
        </div>
        <Link
          to="/subscribe"
          className="inline-flex items-center justify-center bg-gold text-white font-semibold text-[14px] px-6 py-3 rounded-lg no-underline hover:opacity-90 transition-opacity"
        >
          See plans →
        </Link>
      </div>
    </section>
  );
}