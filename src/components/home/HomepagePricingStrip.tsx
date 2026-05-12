import { Link } from "react-router-dom";
import { PLATFORM_PRICING, INTELLIGENCE_PRICING } from "@/config/pricing";

export default function HomepagePricingStrip() {
  return (
    <section className="bg-[#0D1F35] text-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px]">
          <span className="font-semibold">Annual Platform</span>
          <span className="font-display text-[hsl(var(--accent))] text-[22px]">
            {PLATFORM_PRICING.standard()}
          </span>
          <span className="text-white/70">· All tools included · Unlimited assessments</span>
          <span className="text-white/40">·</span>
          <span className="font-semibold">Intelligence Feed from</span>
          <span className="font-display text-[hsl(var(--accent))] text-[22px]">
            {INTELLIGENCE_PRICING.monthly()}
          </span>
        </div>
        <Link
          to="/subscribe"
          className="inline-block bg-[hsl(var(--accent))] text-white text-[14px] font-semibold px-5 py-2.5 rounded-lg hover:bg-[hsl(var(--accent-light))] transition-colors no-underline whitespace-nowrap"
        >
          Get started →
        </Link>
      </div>
    </section>
  );
}
