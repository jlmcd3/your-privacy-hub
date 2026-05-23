import { Link } from "react-router-dom";
import { PLATFORM_PRICING } from "@/config/pricing";
import SectionShell from "./SectionShell";

type Product = {
  title: string;
  blurb: string;
  href: string;
};

const ASSESSMENTS: Product[] = [
  {
    title: "Privacy Program Assessment",
    blurb: "Score your program against the domains regulators actually inspect — calibrated to enforcement precedent.",
    href: "/governance-assessment",
  },
  {
    title: "Legitimate Interest Assessment",
    blurb: "Build a defensible three-part LIA, with prompts tuned to your specific processing activity.",
    href: "/li-assessment",
  },
  {
    title: "Impact Assessment Builder (DPIA)",
    blurb: "Article 35-aligned DPIA with the necessity and proportionality analysis most templates omit.",
    href: "/dpia-framework",
  },
  {
    title: "Biometric Compliance Check",
    blurb: "Pressure-test biometric processing against BIPA, GDPR Art. 9, and emerging state biometric statutes.",
    href: "/biometric-checker",
  },
  {
    title: "CPPA Risk Assessment",
    blurb: "California-specific risk assessment aligned to the CPPA's risk assessment regulations.",
    href: "/cppa-risk-assessment",
  },
  {
    title: "CPPA Cybersecurity Audit",
    blurb: "Structured cybersecurity audit aligned to the CPPA's cybersecurity audit requirements.",
    href: "/cppa-cybersecurity",
  },
  {
    title: "Registration Assessment",
    blurb: "Identify DPO, RoPA, EU AI Act, and Article 27 registration obligations across your jurisdictions.",
    href: "/registration-manager",
  },
];

const DOCUMENTS: Product[] = [
  {
    title: "DPA Generator",
    blurb: "Generate a controller-to-processor Data Processing Agreement tailored to your jurisdictions and transfers.",
    href: "/dpa-generator",
  },
  {
    title: "Incident Response Playbook",
    blurb: "Jurisdiction-specific breach notification timelines and a step-by-step IR playbook for your stack.",
    href: "/ir-playbook",
  },
  {
    title: "RoPA Builder",
    blurb: "Build and maintain your Article 30 Record of Processing Activities — calibrated to your platforms and jurisdictions.",
    href: "/ropa-builder",
  },
  {
    title: "U.S. Privacy Notice Builder",
    blurb: "Generate state-specific consumer privacy notices for CCPA, Virginia, Colorado, and other US state laws.",
    href: "/us-notices",
  },
  {
    title: "EU/UK Privacy Notice Builder",
    blurb: "GDPR & UK GDPR-aligned notices with Article 13/14 disclosures and international transfer language.",
    href: "/eu-notices",
  },
  {
    title: "Registration Documents",
    blurb: "DPO appointments, RoPA templates, EU AI Act registrations, and Article 27 letters — ready for filing.",
    href: "/registration-documents",
  },
];

function ProductColumn({ label, products }: { label: string; products: Product[] }) {
  return (
    <div>
      <p className="text-eyebrow text-[hsl(var(--cobalt))] mb-3">
        {label}
      </p>
      <ul className="space-y-2">
        {products.map((p) => (
          <li key={p.href}>
            <Link
              to={p.href}
              className="block rounded-lg border border-fog bg-paper px-4 py-3 no-underline hover:border-[hsl(var(--cobalt)/0.35)] hover:bg-card transition-colors"
            >
              <h3 className="text-navy mb-1 leading-snug">
                {p.title}
              </h3>
              <p className="text-meta text-slate leading-relaxed">{p.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomepageToolsSection() {
  return (
    <SectionShell
      eyebrow="Compliance Toolkit"
      headline="Assessments and documents in a two-column catalogue"
      subline={`Per-use compliance tools calibrated against 3,700+ enforcement decisions. Annual Platform (${PLATFORM_PRICING.standard()}) adds client workspaces, one free Convenience Tool run per client each month, and the full Intelligence Brief.`}
      ctaLabel="Browse tools →"
      ctaHref="/tools"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 px-5 pt-5 text-meta text-slate-500">
        <span>⚖️ 3,700+ enforcement decisions in training corpus</span>
        <span className="hidden sm:inline text-gray-300">·</span>
        <span>🌍 119 regulatory authorities monitored</span>
        <span className="hidden sm:inline text-gray-300">·</span>
        <span>📅 Updated with each regulatory development</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
        <ProductColumn label="Assessments" products={ASSESSMENTS} />
        <ProductColumn label="Compliance documents" products={DOCUMENTS} />
      </div>
    </SectionShell>
  );
}
