import { Link } from "react-router-dom";
import { PLATFORM_PRICING, INTELLIGENCE_PRICING } from "@/config/pricing";

export default function HomepagePricingStrip() {
  return (
    <div className="bg-[#0D1F35] px-4 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-[11px] text-white/65">
        Annual Platform
        <span className="text-[15px] font-bold text-[#C8922A] mx-2">
          {PLATFORM_PRICING.standard()}
        </span>
        · All tools included · Unlimited assessments
        <span className="mx-2 text-white/25">·</span>
        Intelligence Feed from
        <span className="text-[#C8922A] font-semibold ml-1">
          {INTELLIGENCE_PRICING.monthly()}
        </span>
      </p>
      <Link
        to="/subscribe"
        className="flex-shrink-0 text-[11px] font-bold text-[#0D1F35] bg-[#C8922A] hover:opacity-90 px-5 py-2.5 rounded-lg no-underline transition-opacity"
      >
        Get started →
      </Link>
    </div>
  );
}
