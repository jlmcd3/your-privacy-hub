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
    icon: ShieldCheck,
    title: "Privacy Program Assessment",
    blurb: "Score your program against the domains regulators actually inspect — calibrated to enforcement precedent.",
    price: "From $25 — subscribers · $49 standalone",
    cta: "Run assessment",
    href: "/governance-assessment",
  },
  {
    icon: Scale,
    title: "Legitimate Interest Assessment",
    blurb: "Build a defensible three-part LIA, with prompts tuned to your specific processing activity.",
    price: "From $35 — subscribers · $79 standalone",
    cta: "Build LIA",
    href: "/li-assessment",
  },
  {
    icon: FileSearch,
    title: "Impact Assessment Builder (DPIA)",
    blurb: "Article 35-aligned DPIA with the necessity and proportionality analysis most templates omit.",
    price: "From $49 — subscribers · $99 standalone",
    cta: "Build DPIA",
    href: "/dpia-framework",
  },
  {
    icon: FileSignature,
    title: "DPA Generator",
    blurb: "Generate a controller-to-processor Data Processing Agreement tailored to your jurisdictions and transfers.",
    price: "Subscriber credit · standalone available",
    cta: "Generate DPA",
    href: "/dpa-generator",
  },
  {
    icon: Fingerprint,
    title: "Biometric Compliance Check",
    blurb: "Pressure-test biometric processing against BIPA, GDPR Art. 9, and emerging state biometric statutes.",
    price: "Free tier · paid full report",
    cta: "Check compliance",
    href: "/biometric-checker",
  },
  {
    icon: Siren,
    title: "Incident Response Playbook",
    blurb: "Jurisdiction-specific breach notification timelines and a step-by-step IR playbook for your stack.",
    price: "Subscriber credit · standalone available",
    cta: "Build playbook",
    href: "/ir-playbook",
  },
];

export default function ProToolsBanner() {
  return (
    <section className="my-8 px-4">
      <div className="max-w-[1280px] mx-auto rounded-xl border border-navy/15 bg-gradient-to-br from-navy via-navy to-steel text-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6">
          <div className="max-w-2xl">
            <Badge className="bg-amber-400 text-navy hover:bg-amber-400 mb-3">
              <Sparkles className="w-3 h-3 mr-1" /> Pro Tools
            </Badge>
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Compliance documents, calibrated to enforcement precedent
            </h2>
            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
              Structured assessments and generated documents that draw from 3,500+ enforcement
              decisions — designed for professional review, priced per output. Subscribers get
              every tool at a discount.
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
                  <h3 className="font-display font-bold text-white text-[15px] leading-tight">
                    {t.title}
                  </h3>
                </div>
                <p className="text-blue-100/85 text-[13px] leading-relaxed mb-3 flex-1">
                  {t.blurb}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-blue-200/70 mb-3">
                  {t.price}
                </p>
                <span className="inline-flex items-center text-amber-300 group-hover:text-amber-200 font-semibold text-[13px]">
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
