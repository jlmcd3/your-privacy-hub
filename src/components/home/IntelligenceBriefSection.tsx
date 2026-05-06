import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Critical alerts",
  "Sector analysis",
  "Enforcement trends",
  "Regulatory trajectory",
  "Action recommendations",
];

const stats = [
  { value: "119", label: "Authorities tracked" },
  { value: "150+", label: "Jurisdictions covered" },
  { value: "5", label: "Personalisation inputs" },
  { value: "Every Monday", label: "Ready when you start" },
];

const statusPills = [
  { label: "New", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { label: "Continuing", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { label: "Escalating", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  { label: "Resolved", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
];

export function IntelligenceBriefSection() {
  return (
    <section className="bg-white py-20 border-b border-slate-100">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Eyebrow */}
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-teal-700 mb-4">
          Weekly Intelligence Brief
        </p>

        {/* Headline */}
        <h2 className="text-center font-serif text-4xl md:text-5xl font-bold text-navy leading-tight mb-4">
          Your brief. Your jurisdictions.<br />Your Monday morning edge.
        </h2>

        {/* Sub-headline */}
        <p className="text-center text-lg text-slate-600 max-w-2xl mx-auto mb-12">
          119 authorities tracked. Hours of reading done for you. For $29 a month.
        </p>

        {/* Two-column copy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          {/* Left — Personalisation */}
          <div>
            <h3 className="font-semibold text-navy text-xl mb-3">
              Built around your practice
            </h3>
            <p className="text-slate-600 leading-relaxed mb-5">
              Tell us your jurisdictions, your industry, the regulatory topics you follow, and your professional role — and every Monday morning we deliver the intelligence that is genuinely relevant to your programme. Not a digest of everything. A brief on what matters to you, clear and specific, ready before your week begins. Privacy law covers a lot of ground. You don't have to cover all of it alone.
            </p>
            <div className="flex flex-wrap gap-2">
              {features.map((f) => (
                <span
                  key={f}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Memory */}
          <div>
            <h3 className="font-semibold text-navy text-xl mb-3">
              Your brief carries memory
            </h3>
            <p className="text-slate-600 leading-relaxed mb-5">
              Issues are tracked week over week — new, continuing, escalating, or resolved — so each Monday your brief opens by connecting this week's developments to what was already on your radar. You'll see when an enforcement pattern is building, when a risk you were monitoring has shifted, and when something that had you concerned is behind you. Your knowledge compounds every week. Your brief makes sure none of it slips.
            </p>
            <div className="flex flex-wrap gap-2">
              {statusPills.map((s) => (
                <span
                  key={s.label}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center py-5 px-4 rounded-xl bg-slate-50 border border-slate-100"
            >
              <p className="font-bold text-2xl text-navy mb-1">{s.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Value CTA */}
        <div className="text-center bg-navy rounded-2xl px-8 py-10">
          <p className="text-white text-xl font-semibold mb-2">
            All of this for $29 a month.
          </p>
          <p className="text-slate-300 text-base mb-6 max-w-lg mx-auto">
            119 authorities, 150+ jurisdictions, personalised to your practice, carrying your compliance history. You've got this.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              to="/subscribe"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors no-underline"
            >
              Start your brief
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/sample-brief"
              className="text-slate-300 hover:text-white text-sm underline underline-offset-4 transition-colors"
            >
              See what your brief looks like first →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
