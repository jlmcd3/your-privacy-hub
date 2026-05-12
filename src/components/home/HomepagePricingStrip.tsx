import { Link } from "react-router-dom";
import { PLATFORM_PRICING, INTELLIGENCE_PRICING } from "@/config/pricing";

export default function HomepagePricingStrip() {
  return (
    <section className="bg-navy text-white py-6 px-4">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <p className="text-[14px] text-blue-100/90 flex flex-wrap items-center gap-x-2 gap-y-1 justify-center">
          <span className="font-semibold text-white">Annual Platform</span>
          <span className="font-bold text-accent text-[16px]">{PLATFORM_PRICING.standard()}</span>
          <span>· All tools included · Unlimited assessments</span>
          <span className="text-white/40">·</span>
          <span>Intelligence Feed from</span>
          <span className="font-bold text-accent text-[16px]">{INTELLIGENCE_PRICING.monthly()}</span>
        </p>
        <Link
          to="/subscribe"
          className="text-[14px] font-semibold bg-accent text-white px-5 py-2 rounded-lg hover:opacity-90 no-underline whitespace-nowrap"
        >
          Get started →
        </Link>
      </div>
    </section>
  );
}
