import { Link } from "react-router-dom";
import { PLATFORM_PRICING } from "@/config/pricing";
import SectionShell from "./SectionShell";

const TOOL_GROUPS = [
  {
    label: "Assessments",
    headline: "Know where your programme stands",
    copy: "Governance, legitimate interest, DPIA, CPPA, and biometric checks calibrated to enforcement patterns.",
    href: "/tools",
  },
  {
    label: "Compliance documents",
    headline: "Generate professional starting points",
    copy: "DPAs, incident playbooks, RoPA support, privacy notices, and registration workflows for review by your team.",
    href: "/tools",
  },
];

export default function HomepageToolsSection() {
  return (
    <SectionShell
      eyebrow="Compliance Toolkit"
      headline="Assessments and documents in a two-column catalogue"
      subline={`Annual Platform includes every standard tool at ${PLATFORM_PRICING.standard()}.`}
      ctaLabel="Browse tools →"
      ctaHref="/tools"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
        {TOOL_GROUPS.map((group) => (
          <Link
            key={group.label}
            to={group.href}
            className="block rounded-lg border border-fog bg-paper px-5 py-5 no-underline hover:border-[hsl(var(--cobalt)/0.35)] hover:bg-card transition-colors"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--cobalt))] mb-2">
              {group.label}
            </p>
            <h3 className="font-display text-[18px] font-bold text-navy mb-2 leading-snug">
              {group.headline}
            </h3>
            <p className="text-[13px] text-slate leading-relaxed">{group.copy}</p>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}