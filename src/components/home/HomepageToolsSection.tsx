import { Link } from "react-router-dom";
import SectionShell from "./SectionShell";

interface Tool {
  name: string;
  desc: string;
  href: string;
}

const ASSESSMENTS: Tool[] = [
  { name: "Privacy Programme Assessment",   desc: "11-domain gap analysis against GDPR/CPRA frameworks", href: "/governance-assessment" },
  { name: "Legitimate Interest Assessment", desc: "Three-part test with 3,700+ enforcement precedents",   href: "/li-assessment" },
  { name: "DPIA / Impact Assessment",       desc: "GDPR Art. 35 framework with risk scoring",             href: "/dpia-framework" },
  { name: "Biometric Compliance Check",     desc: "BIPA, GDPR Art. 9, UK GDPR multi-jurisdiction",        href: "/biometric-checker" },
  { name: "CPPA Risk Assessment",           desc: "California CPRA/CCPA enforcement-calibrated gaps",     href: "/cppa-risk-assessment" },
  { name: "CPPA Cybersecurity Readiness",   desc: "18-control CPPA cybersecurity audit framework",        href: "/cppa-cybersecurity" },
];

const DOCUMENTS: Tool[] = [
  { name: "Data Processing Agreement",       desc: "Controller–processor DPA generation",                  href: "/dpa-generator" },
  { name: "Incident Response Playbook",      desc: "Breach notification timelines by jurisdiction",        href: "/ir-playbook" },
  { name: "Record of Processing Activities", desc: "GDPR Art. 30 RoPA builder",                            href: "/ropa" },
  { name: "US Privacy Notice Generator",     desc: "All-states multi-framework notice suite",              href: "/us-notices" },
  { name: "EU/UK Privacy Notice Generator",  desc: "GDPR, UK GDPR, Swiss FADP notice suite",               href: "/eu-notices" },
  { name: "DPA Registration Manager",        desc: "Multi-jurisdiction registration documents",            href: "/registration-assessment" },
];

function ToolRow({ name, desc, href, index }: Tool & { index: number }) {
  const isAlt = index % 2 === 1;
  return (
    <Link
      to={href}
      className={`flex items-start justify-between gap-4 p-4 border-b border-fog last:border-0 ${isAlt ? "bg-slate-50" : "bg-white"} hover:bg-fog/40 transition-colors no-underline`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-[14px] font-semibold text-navy mb-0.5">{name}</h3>
        <p className="text-[12px] text-slate leading-snug">{desc}</p>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 border border-[hsl(var(--accent))]/20 px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5">
        PLATFORM
      </span>
    </Link>
  );
}

function ToolGroup({ label, tools }: { label: string; tools: Tool[] }) {
  return (
    <div className="border border-fog rounded-2xl overflow-hidden bg-white">
      <div className="px-4 py-3 bg-paper/60 border-b border-fog">
        <p className="text-eyebrow text-[hsl(var(--cobalt))]">{label}</p>
      </div>
      {tools.map((t, i) => (
        <ToolRow key={t.href} {...t} index={i} />
      ))}
    </div>
  );
}

export default function HomepageToolsSection() {
  return (
    <SectionShell
      eyebrow="Compliance toolkit"
      headline="Enforcement-calibrated tools, included with Platform"
      subline="Assessments and documents that mirror what regulators actually look for — not checkbox compliance."
      ctaLabel="Browse all tools →"
      ctaHref="/tools"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ToolGroup label="Assessments" tools={ASSESSMENTS} />
        <ToolGroup label="Compliance Documents" tools={DOCUMENTS} />
      </div>
    </SectionShell>
  );
}
