import { Link } from "react-router-dom";
import SectionShell from "./SectionShell";

const TOOLS = {
  assessments: [
    { name: "Privacy Programme Assessment",    desc: "11-domain gap analysis against GDPR/CPRA frameworks",     href: "/governance-assessment" },
    { name: "Legitimate Interest Assessment",  desc: "Three-part test with 3,700+ enforcement precedents",       href: "/li-assessment" },
    { name: "DPIA / Impact Assessment",        desc: "GDPR Art. 35 framework with risk scoring",                 href: "/dpia-framework" },
    { name: "Biometric Compliance Check",      desc: "BIPA, GDPR Art. 9, UK GDPR multi-jurisdiction",           href: "/biometric-checker" },
    { name: "CPPA Risk Assessment",            desc: "California CPRA/CCPA enforcement-calibrated gaps",         href: "/cppa-risk-assessment" },
    { name: "CPPA Cybersecurity Readiness",    desc: "18-control CPPA cybersecurity audit framework",            href: "/cppa-cybersecurity" },
  ],
  documents: [
    { name: "Data Processing Agreement",       desc: "Controller–processor DPA generation",                      href: "/dpa-generator" },
    { name: "Incident Response Playbook",      desc: "Breach notification timelines by jurisdiction",            href: "/ir-playbook" },
    { name: "Record of Processing Activities", desc: "GDPR Art. 30 RoPA builder",                               href: "/ropa" },
    { name: "US Privacy Notice Generator",     desc: "All-states multi-framework notice suite",                  href: "/us-notices" },
    { name: "EU/UK Privacy Notice Generator",  desc: "GDPR, UK GDPR, Swiss FADP notice suite",                  href: "/eu-notices" },
    { name: "DPA Registration Manager",        desc: "Multi-jurisdiction registration documents",                href: "/registration-assessment" },
  ],
};

function ToolRow({ name, desc, href, index }: { name: string; desc: string; href: string; index: number }) {
  const isEven = index % 2 === 1;
  return (
    <Link
      to={href}
      className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 ${
        isEven ? "bg-slate-50" : "bg-white"
      } hover:bg-blue-50/40 transition-colors group no-underline`}
    >
      <div>
        <p className="text-[11px] font-semibold text-navy leading-tight group-hover:text-[#2563EB] transition-colors">
          {name}
        </p>
        <p className="text-[9px] text-slate mt-0.5">{desc}</p>
      </div>
      <span className="flex-shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
        PLATFORM
      </span>
    </Link>
  );
}

function ToolGroup({ label, tools }: { label: string; tools: typeof TOOLS.assessments }) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate">{label}</span>
      </div>
      {tools.map((t, i) => <ToolRow key={t.name} {...t} index={i} />)}
    </div>
  );
}

export default function HomepageToolsSection() {
  return (
    <SectionShell
      eyebrow="Compliance Platform"
      headline="Professional tools built on enforcement precedent."
      subline="Assessments, documents, and compliance programmes — calibrated to how regulators actually act. Included in Annual Platform."
      ctaLabel="Browse all tools →"
      ctaHref="/tools"
    >
      <div className="p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToolGroup label="Assessments" tools={TOOLS.assessments} />
          <ToolGroup label="Documents & Filings" tools={TOOLS.documents} />
        </div>
      </div>
    </SectionShell>
  );
}
