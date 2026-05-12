import { Link } from "react-router-dom";
import SectionShell from "./SectionShell";

const STATS = [
  { value: "119",        label: "Authorities monitored" },
  { value: "150+",       label: "Jurisdictions covered" },
  { value: "Every Mon",  label: "Delivered to your inbox" },
  { value: "24",         label: "Languages available" },
];

export default function HomepageBriefSection() {
  return (
    <SectionShell
      eyebrow="Weekly Privacy Intelligence Report"
      headline="Know where you stand against what regulators actually enforce."
      subline="Structured assessments calibrated to 3,700+ enforcement decisions. Score your programme, run a defensible LIA, build your DPIA."
      ctaLabel="See sample report →"
      ctaHref="/#brief"
    >
      <div className="bg-[#0D1F35] px-5 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-6">
          {STATS.map((s, i) => (
            <div
              key={i}
              className={`px-4 py-3 ${i < 3 ? "border-r border-white/10" : ""}`}
            >
              <p className="font-display font-bold text-[22px] text-[#C8922A] leading-none mb-1">
                {s.value}
              </p>
              <p className="text-[10px] text-white/55">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              icon: "🎯",
              title: "Built around your practice",
              desc: "Not a digest of everything. Intelligence filtered to your jurisdictions, role, and tracked topics.",
            },
            {
              icon: "🔄",
              title: "Your brief carries memory",
              desc: "Issues tracked week over week — you see when enforcement patterns build, escalate, or resolve.",
            },
            {
              icon: "⚡",
              title: "Action intelligence, not summaries",
              desc: "Every development includes specific action items by timeframe and role.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3"
            >
              <div className="text-[14px] mb-2">{f.icon}</div>
              <p className="text-[11px] font-semibold text-white mb-1">{f.title}</p>
              <p className="text-[10px] text-white/55 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <Link
            to="/get-intelligence"
            className="text-[12px] font-bold text-[#0D1F35] bg-[#C8922A] hover:opacity-90 px-5 py-2.5 rounded-lg no-underline transition-opacity"
          >
            Get your Privacy Intelligence Report →
          </Link>
          <Link
            to="/subscribe"
            className="text-[12px] font-medium text-white/60 hover:text-white no-underline"
          >
            See all plans →
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
