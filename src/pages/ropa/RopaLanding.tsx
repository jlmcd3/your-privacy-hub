
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Link } from "react-router-dom";
import ToolTierNote from "@/components/tools/ToolTierNote";
import { Button } from "@/components/ui/button";
import SampleReportLink from "@/components/SampleReportLink";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, ExternalLink, FileText, ListChecks, Download } from "lucide-react";
import { INTELLIGENCE_PRICING } from "@/config/pricing";
import { useToolPrice } from "@/hooks/useToolPrice";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";

const TITLE =
  "RoPA Builder · Records of Processing | End User Privacy";
const META_DESCRIPTION =
  "Build a GDPR-compliant Records of Processing Activities in under an hour. Covers 25+ jurisdictions including EU GDPR, UK GDPR, LGPD, and CCPA.";

const STEPS = [
  {
    icon: ListChecks,
    title: "Answer plain-language questions",
    body: "About your data processing activities, in plain language (no legal jargon).",
  },
  {
    icon: FileText,
    title: "We assemble the complete RoPA",
    body: "Document is built automatically from your answers, with citations.",
  },
  {
    icon: Download,
    title: "Download your audit-ready record",
    body: "Export in PDF, Word, or Excel, formatted for regulator review.",
  },
];

const JURISDICTIONS: { region: string; items: string[] }[] = [
  { region: "EU & EEA", items: ["GDPR", "France", "Germany", "Italy", "Spain", "Netherlands", "Ireland"] },
  { region: "United Kingdom", items: ["UK GDPR", "DPA 2018"] },
  { region: "United States", items: ["CCPA / CPRA", "VCDPA", "CPA", "CTDPA", "UCPA"] },
  { region: "Brazil", items: ["LGPD"] },
  { region: "Asia-Pacific", items: ["Singapore PDPA", "Australia Privacy Act", "Japan APPI", "South Korea PIPA"] },
  { region: "Others", items: ["Switzerland nFADP", "Canada PIPEDA", "South Africa POPIA"] },
];

const PRICING_ROWS: { feature: string; free: string; intel: string }[] = [
  { feature: "Complete Q&A tool", free: "Subscribers only", intel: "Included" },
  { feature: "Save & resume", free: "Subscribers only", intel: "Included" },
  { feature: "25+ jurisdictions", free: "Subscribers only", intel: "Included" },
  { feature: "Generate PDF / Word / Excel", free: "Subscribers only", intel: "Included" },
  { feature: "Annual refresh", free: "Subscribers only", intel: "Included" },
  { feature: "Multi-client management", free: "Subscribers only", intel: "Included" },
];

const FAQ = [
  {
    q: "Do I legally need a RoPA?",
    a: "Yes for GDPR Article 30 — required for controllers with 250+ employees, or any size if processing is regular, high-risk, or includes special categories of personal data.",
  },
  {
    q: "How long does it take?",
    a: "35–50 minutes the first time. Annual refreshes typically take 15–25 minutes.",
  },
  {
    q: "What jurisdictions are covered?",
    a: "25+ frameworks including EU GDPR, UK GDPR, CCPA/CPRA, LGPD, Swiss nFADP, Singapore PDPA, and more.",
  },
  {
    q: "Is my data secure?",
    a: "Your answers are stored in our managed backend with row-level security. We do not share or sell your data.",
  },
  {
    q: "What's a DPIA?",
    a: "A Data Protection Impact Assessment — a separate assessment required for high-risk processing. We offer a dedicated DPIA tool.",
  },
  {
    q: "Can I edit the RoPA after generating?",
    a: "Yes. Through the annual refresh flow, you can add new activities, confirm unchanged ones, or update existing entries.",
  },
];

export default function RopaLanding() {
  useToolStartedOnInteraction("ropa");
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType = user ? "authenticated" : "anonymous";

  const pricing = useToolPrice("ropa_initial");
  useEffect(() => {
    document.title = TITLE;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = META_DESCRIPTION;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ToolTierNote />
      </div>
      <header className="bg-brand-navy text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            📚 RoPA Builder · Included with any subscription
          </span>
          <h1 className="font-serif text-white mb-3">
            Build an audit-ready Record of Processing Activities (RoPA) in minutes
          </h1>
          <RequirementBadge variant="hero" tier="required" text="GDPR Article 30 requires a Record of Processing Activities — the under-250-employee exemption falls away if your processing is regular, risky, or involves special-category data." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
            Guided questions in plain language. Covers GDPR Article 30, LGPD, CCPA, and 20+
            frameworks. Included with every Intelligence and Professional subscription,
            monthly or annual. Not sold as a standalone product.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              <Link to="/get-intelligence" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View subscription plans", cta_position: "hero" })}>
                View subscription plans <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
            >
              <Link to="/#brief">
                See sample document <ExternalLink className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <SampleReportLink toolSlug="ropa" tone="onDark" />
          </div>
        </div>
      </header>
      <main className="flex-1">

        {/* TRUST BAR */}
        <section className="border-y border-border bg-muted/30 py-6 px-4">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span>25+ jurisdictions</span>
            <span aria-hidden>·</span>
            <span>Article 30-compliant</span>
            <span aria-hidden>·</span>
            <span>Used by privacy professionals</span>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif text-center mb-10">
              How it works
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li
                    key={s.title}
                    className="bg-card border border-border rounded-2xl p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        Step {i + 1}
                      </span>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-foreground mb-2">
                      {s.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{s.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* JURISDICTION COVERAGE */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-muted/20 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif text-center mb-3">
              Jurisdiction coverage
            </h2>
            <p className="text-center text-muted-foreground mb-10 text-sm">
              25+ data protection frameworks across six regions.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {JURISDICTIONS.map((j) => (
                <div key={j.region} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-foreground mb-3">
                    {j.region}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {j.items.map((item) => (
                      <Badge key={item} variant="secondary" className="font-normal">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-center mb-3">
              Pricing
            </h2>
            <p className="text-center text-muted-foreground mb-10 text-sm">
              Included with any active subscription, with no per-document fees.
            </p>

            <div className="cmp-table overflow-x-auto border border-border rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-4 font-serif text-base text-foreground">
                      Feature
                    </th>
                    <th className="text-center p-4 font-serif text-base text-foreground">
                      Free / unregistered
                    </th>
                    <th className="text-center p-4 font-serif text-base text-foreground">
                      Subscribers ({INTELLIGENCE_PRICING.monthly()})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_ROWS.map((row) => (
                    <tr key={row.feature} className="border-t border-border">
                      <td className="p-4 text-foreground">{row.feature}</td>
                      <td className="p-4 text-center text-muted-foreground">
                        {row.free === "Included" ? (
                          <Check className="h-4 w-4 text-success inline" aria-label="Included" />
                        ) : (
                          row.free
                        )}
                      </td>
                      <td className="p-4 text-center text-foreground font-medium">
                        {row.intel === "Included" ? (
                          <Check className="h-4 w-4 text-success inline" aria-label="Included" />
                        ) : (
                          row.intel
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Intelligence subscription: {INTELLIGENCE_PRICING.combined()}.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-muted/20 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-center mb-10">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-serif text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h2 className="font-serif text-foreground mb-4">
            Included with any subscription.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            RoPA Builder is included with every Intelligence and Professional
            subscription (monthly or annual). It is not sold as a standalone
            product.
          </p>
          <Button asChild size="lg">
            <Link to="/subscribe" onClick={() => { fireConversion("subscribe_cta_click", { cta_label: "Included with any subscription", cta_position: "article-footer" }); fireConversion("tool_start_click", { tool_slug: "ropa", page_path: "/ropa-builder", user_type: userType }); }}>
              Included with any subscription: Subscribe <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
