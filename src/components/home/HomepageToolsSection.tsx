import { Link } from "react-router-dom";
import { PLATFORM_PRICING } from "@/config/pricing";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import SectionShell from "./SectionShell";

type Product = {
  title: string;
  blurb: string;
  /** Either a static path or a function returning the right path for the viewer. */
  href: string | ((ctx: { hasToolAccess: boolean }) => string);
};

const ASSESSMENTS: Product[] = [
  {
    title: "Privacy Programme Assessment",
    blurb: "Score your program against the domains regulators actually inspect — with cited enforcement decisions behind every risk finding.",
    href: "/governance-assessment",
  },
  {
    title: "Legitimate Interest Assessment",
    blurb: "Build a defensible three-part LIA — each test verdict backed by cited enforcement precedents.",
    href: "/li-assessment",
  },
  {
    title: "Impact Assessment Builder (DPIA)",
    blurb: "Article 35-aligned DPIA with necessity and proportionality analysis — annotated with supervisory authority decisions.",
    href: "/dpia-framework",
  },
  {
    title: "Biometric Privacy Compliance Assessment",
    blurb: "Pressure-test biometric processing against BIPA, GDPR Art. 9, and emerging state statutes — priority actions backed by cited enforcement decisions.",
    href: "/biometric-checker",
  },
  {
    title: "CPPA Scope Checker",
    blurb: "Quickly determine whether your business is in scope of the California Privacy Rights Act and CPPA regulations.",
    href: "/cppa-scope-checker",
  },
  {
    title: "CPPA Risk Assessment",
    blurb: "California-specific risk assessment aligned to CPPA regulations — domain findings supported by cited CPPA and AG enforcement context.",
    href: "/cppa-risk-assessment",
  },
  {
    title: "CPPA Cybersecurity Audit",
    blurb: "Structured cybersecurity audit aligned to CPPA regulations — control gaps supported by cited enforcement and regulatory guidance.",
    href: "/cppa-cybersecurity",
  },
  {
    title: "ADMT Compliance Assessment",
    blurb: "Gap analysis for ADMT pre-use notices, opt-out, and access rights under 11 CCR §§ 7200–7222. January 2027 deadline.",
    href: "/cppa-admt-checker",
  },
  {
    title: "Registration Manager",
    blurb: "Identify DPO, RoPA, EU AI Act, and Article 27 registration obligations across your jurisdictions.",
    href: "/registration-manager",
  },
];

const DOCUMENTS: Product[] = [
  {
    title: "DPA Generator",
    blurb: "Generate a controller-to-processor DPA tailored to your jurisdictions — with a Drafting Notes appendix citing the enforcement decisions behind every clause choice.",
    href: "/dpa-generator",
  },
  {
    title: "Incident Response Playbook",
    blurb: "Jurisdiction-specific breach notification timelines and a step-by-step IR playbook — enforcement decisions cited for every deadline and threshold recommendation.",
    href: "/ir-playbook",
  },
  {
    title: "RoPA Builder (Article 30)",
    blurb: "Build and maintain your Article 30 Record of Processing Activities — calibrated to your platforms and jurisdictions.",
    href: ({ hasToolAccess }) => (hasToolAccess ? "/ropa" : "/ropa-builder"),
  },
  {
    title: "Privacy Notice Builder (US + EU/Global)",
    blurb: "Generate US state notices (CCPA + 19 more) and GDPR/UK GDPR/LGPD/APPI/DPDPA notices — one builder, one workspace. Included with any subscription.",
    href: ({ hasToolAccess }) => (hasToolAccess ? "/notices-ropa" : "/notice-builder"),
  },
  {
    title: "Registration Manager",
    blurb: "DPO appointments, RoPA templates, EU AI Act registrations, and Article 27 letters — ready for filing.",
    href: "/registration-manager",
  },
];

function ProductColumn({
  label,
  products,
  hasToolAccess,
}: {
  label: string;
  products: Product[];
  hasToolAccess: boolean;
}) {
  return (
    <div>
      <p className="text-eyebrow text-[hsl(var(--cobalt))] mb-3">{label}</p>
      <ul className="space-y-2">
        {products.map((p, idx) => {
          const href = typeof p.href === "function" ? p.href({ hasToolAccess }) : p.href;
          return (
            <li key={`${p.title}-${idx}`}>
              <Link
                to={href}
                className="block rounded-lg border border-brand-cloud bg-brand-cloud px-4 py-3 no-underline hover:border-[hsl(var(--cobalt)/0.35)] hover:bg-card transition-colors"
              >
                <h3 className="text-brand-navy mb-1 leading-snug">{p.title}</h3>
                <p className="text-meta text-slate leading-relaxed">{p.blurb}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function HomepageToolsSection() {
  const { hasToolAccess } = useSubscriptionTier();
  return (
    <SectionShell
      eyebrow="Compliance Toolkit"
      headline="Assessments and documents in a two-column catalogue"
      subline={`Per-use compliance tools calibrated against 3,700+ enforcement decisions. Any subscription includes RoPA, Notice Builders, IR Playbook, Biometric Checker, and DPA Generator; annual plans add 1 free Smart Tool run per year.`}
      ctaLabel="Browse tools →"
      ctaHref="/tools"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 px-5 pt-5 text-meta text-slate-500">
        <span>⚖️ Thousands of enforcement decisions in training corpus</span>
        <span className="hidden sm:inline text-gray-300">·</span>
        <span>🌍 Regulatory authorities monitored from across the world</span>
        <span className="hidden sm:inline text-gray-300">·</span>
        <span>📅 Updated with each regulatory development</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
        <ProductColumn label="Assessments" products={ASSESSMENTS} hasToolAccess={hasToolAccess} />
        <ProductColumn label="Compliance documents" products={DOCUMENTS} hasToolAccess={hasToolAccess} />
      </div>
    </SectionShell>
  );
}
