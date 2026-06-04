// Homepage cross-link panel surfacing the most important Pro tools
// (assessments + document generators). Mirrors the visual treatment
// of RegistrationManagerBanner so the tools feel equally prominent.

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ShieldCheck,
  Scale,
  FileSearch,
  FileSignature,
  Fingerprint,
  Siren,
  Sparkles,
  ClipboardList,
  Database,
  FileText,
  Globe,
  ShieldAlert,
  Lock,
} from "lucide-react";

type Tool = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
  price: string;
  cta: string;
  href: string;
};

const TOOLS: Tool[] = [
  {
    icon: ClipboardList,
    title: "Registration Manager",
    blurb: "DPO appointments, RoPA templates, EU AI Act registrations, and Article 27 letters — tailored to your jurisdictions.",
    price: "Free assessment · pay only when you generate",
    cta: "Start free assessment",
    href: "/registration-manager",
  },
  {
    icon: ShieldCheck,
    title: "Privacy Program Assessment",
    blurb: "Score your program against the domains regulators actually inspect — cited enforcement decisions behind every risk finding.",
    price: "$89",
    cta: "Run assessment",
    href: "/governance-assessment",
  },
  {
    icon: Scale,
    title: "Legitimate Interest Assessment",
    blurb: "Build a defensible three-part LIA — each test verdict annotated with cited enforcement precedents.",
    price: "$69",
    cta: "Build LIA",
    href: "/li-assessment",
  },
  {
    icon: FileSearch,
    title: "Impact Assessment Builder (DPIA)",
    blurb: "Article 35-aligned DPIA — risk items annotated with cited supervisory authority decisions.",
    price: "$79",
    cta: "Build DPIA",
    href: "/dpia-framework",
  },
  {
    icon: FileSignature,
    title: "DPA Generator",
    blurb: "Generate a controller-to-processor DPA — includes a Drafting Notes appendix citing the enforcement decisions behind every clause choice.",
    price: "$49 per run",
    cta: "Generate DPA",
    href: "/dpa-generator",
  },
  {
    icon: Fingerprint,
    title: "Biometric Compliance Check",
    blurb: "Pressure-test biometric processing against BIPA, GDPR Art. 9, and emerging state statutes — priority actions cited to enforcement actions.",
    price: "Included with Annual Platform · $15 standalone",
    cta: "Check compliance",
    href: "/biometric-checker",
  },
  {
    icon: Siren,
    title: "Incident Response Playbook",
    blurb: "Jurisdiction-specific breach notification timelines and a step-by-step IR playbook — cited enforcement decisions behind every deadline recommendation.",
    price: "Included with Annual Platform",
    cta: "Build playbook",
    href: "/ir-playbook",
  },
  {
    icon: Database,
    title: "RoPA Builder",
    blurb: "Build and maintain your Article 30 Record of Processing Activities — calibrated to your platforms and jurisdictions.",
    price: "$40 · 1 free run/client/month (Annual)",
    cta: "Build RoPA",
    href: "/ropa-builder",
  },
  {
    icon: FileText,
    title: "U.S. Privacy Notice Builder",
    blurb: "Generate state-specific consumer privacy notices for CCPA, Virginia, Colorado, and other US state laws.",
    price: "$25 · 1 free run/client/month (Annual)",
    cta: "Build U.S. notice",
    href: "/us-notices",
  },
  {
    icon: Globe,
    title: "EU/UK Privacy Notice Builder",
    blurb: "GDPR & UK GDPR-aligned notices with Article 13/14 disclosures and international transfer language.",
    price: "$50 · 1 free run/client/month (Annual)",
    cta: "Build EU/UK notice",
    href: "/eu-notices",
  },
  {
    icon: ShieldAlert,
    title: "CPPA Risk Assessment",
    blurb: "California-specific risk assessment aligned to CPPA regulations — domain findings supported by cited enforcement context.",
    price: "$55 per run",
    cta: "Run CPPA assessment",
    href: "/cppa-risk-assessment",
  },
  {
    icon: Lock,
    title: "CPPA Cybersecurity Audit",
    blurb: "Structured cybersecurity audit aligned to CPPA regulations — control gap findings supported by cited enforcement and regulatory guidance.",
    price: "$70 per run",
    cta: "Run cybersecurity audit",
    href: "/cppa-cybersecurity",
  },
];

export default function ProToolsBanner() {
  return (
    <section className="my-8 px-4">
      <div className="max-w-[1280px] mx-auto rounded-xl border border-brand-navy/15 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-steel text-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6">
          <div className="max-w-2xl">
            <Badge className="bg-amber-400 text-brand-navy hover:bg-amber-400 mb-3">
              <Sparkles className="w-3 h-3 mr-1" /> Pro Tools
            </Badge>
            <h2 className="font-display mb-2">
              Compliance documents, calibrated to enforcement precedent
            </h2>
            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
              Structured assessments and generated documents that draw from 3,500+ enforcement
              decisions — designed for professional review, priced per output. Per-run pricing for
              all tiers. Professional Annual subscribers receive 1 free Convenience Tool run per
              client per month.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white flex-shrink-0"
          >
            <Link to="/tools">
              See all Pro tools <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                to={t.href}
                className="group flex flex-col rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 hover:border-amber-400/50 transition-all p-5 no-underline"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-md bg-amber-400/15 text-amber-300 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white text-[15px] leading-tight">
                    {t.title}
                  </h3>
                </div>
                <p className="text-blue-100/85 text-sm leading-relaxed mb-3 flex-1">
                  {t.blurb}
                </p>
                <p className="text-meta uppercase tracking-wide text-blue-200/70 mb-3">
                  {t.price}
                </p>
                <span className="inline-flex items-center text-amber-300 group-hover:text-amber-200 font-semibold text-sm">
                  {t.cta} <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
