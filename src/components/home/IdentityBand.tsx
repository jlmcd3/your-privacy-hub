import { Link } from "react-router-dom";

export default function IdentityBand() {
  return (
    <div className="bg-gradient-to-r from-navy via-steel to-navy border-b border-white/10">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-5 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          {/* Left: identity statement */}
          <div>
            <h1 className="font-display font-bold text-white text-[20px] md:text-[22px] leading-tight mb-1.5">
              The intelligence platform for privacy professionals.
            </h1>
            <p className="text-blue-200 text-[13px] leading-relaxed">
              Tracking every move in global privacy regulation —
              <span className="text-white/70 font-medium"> GDPR · AI Act · CCPA · PIPL · Enforcement · 150+ jurisdictions</span>
            </p>
          </div>

          {/* Right: two CTAs */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/updates"
              className="text-[13px] font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all px-5 py-2 rounded-lg no-underline"
            >
              Browse free →
            </Link>
            <Link
              to="/subscribe"
              className="text-[13px] font-bold text-navy bg-white hover:bg-blue-50 transition-all px-5 py-2 rounded-lg no-underline shadow-eup-sm"
            >
              Get the brief
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
