import { Link } from "react-router-dom";

const TOOL_ROUTES: Record<string, string> = {
  "Privacy Programme Assessment":   "/governance-assessment",
  "Legitimate Interest Assessment": "/li-assessment",
  "DPIA / Impact Assessment":       "/dpia-framework",
  "Biometric Compliance Check":     "/biometric-checker",
  "CPPA Risk Assessment":           "/cppa-risk-assessment",
  "CPPA Cybersecurity Readiness":   "/cppa-cybersecurity",
  "Data Processing Agreement":      "/dpa-generator",
  "Incident Response Playbook":     "/ir-playbook",
  "Record of Processing Activities":"/ropa",
  "US Privacy Notice Generator":    "/us-notices",
  "EU/UK Privacy Notice Generator": "/eu-notices",
  "DPA Registration Manager":       "/registration-assessment",
};

const ASSESSMENTS = [
  { name: "Privacy Programme Assessment",   desc: "11-domain gap analysis against GDPR/CPRA frameworks" },
  { name: "Legitimate Interest Assessment", desc: "Three-part test with precedent calibration" },
  { name: "DPIA / Impact Assessment",       desc: "GDPR Art. 35 framework with risk scoring" },
  { name: "Biometric Compliance Check",     desc: "BIPA, GDPR Art. 9, UK GDPR multi-jurisdiction" },
  { name: "CPPA Risk Assessment",           desc: "California CPRA/CCPA enforcement-calibrated gaps" },
  { name: "CPPA Cybersecurity Readiness",   desc: "18-control CPPA cybersecurity audit framework" },
];

const DOCUMENTS = [
  { name: "Data Processing Agreement",       desc: "Controller–processor DPA generation" },
  { name: "Incident Response Playbook",      desc: "Breach notification timelines by jurisdiction" },
  { name: "Record of Processing Activities", desc: "GDPR Art. 30 RoPA builder" },
  { name: "US Privacy Notice Generator",     desc: "All-states multi-framework notice suite" },
  { name: "EU/UK Privacy Notice Generator",  desc: "GDPR, UK GDPR, Swiss FADP suite" },
  { name: "DPA Registration Manager",        desc: "Multi-jurisdiction registration documents" },
];

function ToolRow({ name, desc }: { name: string; desc: string }) {
  const href = TOOL_ROUTES[name] ?? "/tools";
  return (
    <Link
      to={href}
      className="flex items-center justify-between gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-muted/50 no-underline group"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-[14px] text-navy group-hover:text-[#2563EB] leading-snug">
          {name}
        </p>
        <p className="text-[12px] text-slate leading-snug mt-0.5">{desc}</p>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-1.5 py-0.5 rounded flex-shrink-0">
        Platform
      </span>
    </Link>
  );
}

function ToolGroup({ label, tools }: { label: string; tools: typeof ASSESSMENTS }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate mb-3 pb-2 border-b border-fog">
        {label}
      </p>
      <div className="divide-y divide-fog/60">
        {tools.map(t => <ToolRow key={t.name} {...t} />)}
      </div>
    </div>
  );
}

export default function HomepageTools() {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-[24px] font-bold text-navy">
            Compliance Platform
          </h2>
          <Link to="/tools" className="text-[13px] font-semibold text-[#2563EB] no-underline hover:underline">
            Browse all tools →
          </Link>
        </div>
        <p className="text-[15px] text-navy font-medium mb-1">
          Professional tools built on enforcement precedent.
        </p>
        <p className="text-[14px] text-slate mb-8">
          Assessments, documents, and compliance programmes — calibrated to how regulators actually act.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <ToolGroup label="Assessments" tools={ASSESSMENTS} />
          <ToolGroup label="Documents" tools={DOCUMENTS} />
        </div>
      </div>
    </section>
  );
}
