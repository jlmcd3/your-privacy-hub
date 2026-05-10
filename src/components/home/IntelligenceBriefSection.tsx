import { Link } from "react-router-dom";
import type { ReactNode } from "react";

const stats = [
  { value: "119", label: "Authorities tracked" },
  { value: "150+", label: "Jurisdictions covered" },
  { value: "5", label: "Personalisation inputs" },
  { value: "Every Monday", label: "Ready when you start" },
];

export function IntelligenceBriefSection({ children }: { children?: ReactNode }) {
  return (
    <section className="my-8 px-4">
      <div className="max-w-[1280px] mx-auto rounded-xl bg-gradient-to-br from-navy via-navy to-[#1A3A5C] overflow-hidden">
        {/* Navy header */}
        <div className="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 md:pt-8 pb-5">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-widest text-blue-300 mb-2">
              Weekly Privacy Intelligence Report
            </p>
            <h2 className="font-display text-4xl md:text-[32px] font-bold text-white leading-tight mb-1.5">
              Your report. Your jurisdictions. Your Monday morning edge.
            </h2>
            <p className="text-blue-100/80 text-sm leading-relaxed">
              Hours of reading and analysis done for you — for $29 a month
            </p>
          </div>
          <Link
            to="/#brief"
            className="flex-shrink-0 mt-1 text-[14px] font-semibold text-white/80 border border-white/25 px-3 py-1.5 rounded-lg hover:bg-white/10 no-underline transition-colors whitespace-nowrap"
          >
            See a sample →
          </Link>
        </div>

        {/* Two white cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-4 md:px-6">
          {/* CARD 1 — Personalisation */}
          <div className="bg-card rounded-xl border border-fog p-5 flex flex-col">
            <div className="w-9 h-9 rounded-lg bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 mb-3">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="10" cy="7" r="3" />
                <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest bg-[#E1F5EE] text-[#1D9E75] px-2 py-0.5 rounded inline-block mb-2 w-fit">
              Personalised
            </span>
            <h3 className="font-display font-bold text-[17px] text-navy leading-snug mb-1">
              Built around your practice
            </h3>
            <p className="text-[14px] text-slate leading-relaxed">
              Tell us your jurisdictions, your industry, the regulatory topics you follow, and your professional role — and every Monday morning we deliver the intelligence that is genuinely relevant to your programme. Not a digest of everything. A brief on what matters to you, clear and specific, ready before your week begins. Privacy law covers a lot of ground. You don't have to cover all of it alone.
            </p>
          </div>

          {/* CARD 2 — Memory */}
          <div className="bg-card rounded-xl border border-fog p-5 flex flex-col">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mb-3">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="10" cy="10" r="7" />
                <polyline points="10,5 10,10 13,12" />
              </svg>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest bg-blue-50 text-blue-800 px-2 py-0.5 rounded inline-block mb-2 w-fit">
              Continuity
            </span>
            <h3 className="font-display font-bold text-[17px] text-navy leading-snug mb-1">
              Your brief carries memory
            </h3>
            <p className="text-[14px] text-slate leading-relaxed">
              Issues are tracked week over week — new, continuing, escalating, or resolved — so each Monday your report opens by connecting this week's developments to what was already on your radar. You'll see when an enforcement pattern is building, when a risk you were monitoring has shifted, and when something that had you concerned is behind you. Your knowledge compounds every week. Your report makes sure none of it slips.
            </p>
          </div>
        </div>

        {children && (
          <div className="px-4 md:px-6 pt-6">
            {children}
          </div>
        )}

        <div className="pb-4 md:pb-6" />
      </div>
    </section>
  );
}
