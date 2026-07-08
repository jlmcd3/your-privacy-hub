import { Link } from "react-router-dom";
import { PRICING } from "@/config/pricing";

export default function HomepagePricingStrip() {
  return (
    <section className="bg-brand-navy py-9 px-4">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <p className="text-eyebrow text-brand-teal-on-navy mb-2">
            Subscription options
          </p>
          <h2 className="text-section-h2 text-white leading-tight">
            Intelligence on its own, or step up to Professional
          </h2>
          <p className="text-sm text-blue-100/80 mt-2">
            Intelligence from {PRICING.intelligence.monthly.display}/month · Professional from {PRICING.professional.base.display}/month + {PRICING.professional.perClient.display}/client/year · Tools available standalone
          </p>
        </div>
        <Link
          to="/subscribe"
          className="inline-flex items-center justify-center bg-brand-teal-deep text-white font-semibold text-sm px-6 py-3 rounded-lg no-underline hover:opacity-90 transition-opacity"
        >
          See plans →
        </Link>
      </div>
    </section>
  );
}
