import { Link } from "react-router-dom";
import SectionShell from "./SectionShell";

const STATS = [
  { value: "119",       label: "Authorities monitored" },
  { value: "150+",      label: "Jurisdictions covered" },
  { value: "Every Mon", label: "Delivered to inbox" },
  { value: "24",        label: "Languages available" },
];

const FEATURES = [
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
];

export default function HomepageBriefSection() {
  return (
    <SectionShell
      eyebrow="Privacy Intelligence Report"
      headline="The Monday brief that sets your week"
      subline="Customized and analyzed for your priorities and responsibilities."
      className="bg-white"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="border border-fog rounded-xl p-4 text-center bg-paper/40"
          >
            <p className="font-display text-[28px] text-navy leading-none mb-1">{s.value}</p>
            <p className="text-[12px] text-slate uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {FEATURES.map((f) => (
          <div key={f.title} className="border border-fog rounded-xl p-5 bg-white">
            <div className="text-[24px] mb-2" aria-hidden>{f.icon}</div>
            <h3 className="text-[15px] font-semibold text-navy mb-1">{f.title}</h3>
            <p className="text-[13px] text-slate leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to="/get-intelligence"
          className="inline-block bg-[hsl(var(--accent))] text-white text-[14px] font-semibold px-5 py-2.5 rounded-lg hover:bg-[hsl(var(--accent-light))] transition-colors no-underline"
        >
          Get your Privacy Intelligence Report →
        </Link>
        <Link
          to="/subscribe"
          className="inline-block border border-fog text-navy text-[14px] font-semibold px-5 py-2.5 rounded-lg hover:bg-fog transition-colors no-underline"
        >
          See all plans →
        </Link>
      </div>
    </SectionShell>
  );
}
