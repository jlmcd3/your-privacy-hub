import { Link } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

export default function NewsfeedPaywallCard() {
  const { isPremium, isLoading } = usePremiumStatus();
  if (isLoading || isPremium) return null;
  return (
    <div className="relative my-6 rounded-2xl overflow-hidden border border-brand-teal/20">
      {/* Blurred ghost articles behind */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center px-8 py-10 bg-white/90 backdrop-blur-sm">
        <h3 className="text-brand-navy mb-2">
          Access the full Privacy Intelligence Feed
        </h3>
        <p className="text-slate text-sm max-w-md mb-6 leading-relaxed">
          Full archive access, advanced search, and your weekly Privacy Intelligence Report written for your industry.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            to="/subscribe"
            className="bg-gradient-to-br from-brand-steel to-brand-teal text-white font-semibold text-sm px-6 py-2.5 rounded-lg no-underline hover:opacity-90 transition-all"
          >
            Subscribe to Privacy Intelligence Feed →
          </Link>
          <Link
            to="/contact"
            className="border border-brand-cloud text-brand-navy font-medium text-sm px-6 py-2.5 rounded-lg no-underline hover:bg-brand-cloud transition-all"
          >
            Request beta access
          </Link>
        </div>
      </div>
    </div>
  );
}
