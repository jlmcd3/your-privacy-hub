
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SampleReportLink from "@/components/SampleReportLink";
import { productEyebrow } from "@/config/productEyebrow";
import { ProductHero } from "@/components/ProductHero";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, ExternalLink, FileText, ListChecks, Download, BookOpen } from 'lucide-react';
import { INTELLIGENCE_PRICING } from "@/config/pricing";
import { useToolPrice } from "@/hooks/useToolPrice";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

const TITLE =
  "RoPA Builder · Records of Processing | End User Privacy";
const META_DESCRIPTION =
  "Build a GDPR-compliant Records of Processing Activities in under an hour. Covers 25+ jurisdictions including EU GDPR, UK GDPR, LGPD, and CCPA.";

const STEPS = [
  {
    icon: ListChecks,
    title: "Describe processing activities",
    body: "Guided, plain-language questions; save and resume at any point.",
  },
  {
    icon: FileText,
    title: "We assemble the RoPA",
    body: "Required fields are organised by framework, with citations, reusing your answers across jurisdictions wherever they apply.",
  },
  {
    icon: Download,
    title: "Export and maintain",
    body: "Download PDF, Word, or Excel; return later to refresh changed activities.",
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
  const { tier } = useSubscriptionTier();
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

  const isAnnual = tier === "annual" || tier === "annual_founding";
  const isMonthlySub = tier === "monthly";
  const primary = isAnnual
    ? { label: "Build my RoPA", to: "/ropa" }
    : isMonthlySub
      ? { label: `Start RoPA — $${pricing.price}`, to: "/ropa" }
      : { label: "Choose an annual plan", to: "/get-intelligence" };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      {/* PRE-INTAKE REDESIGN (2026-08-26): name-led H1; the Article 30 legal
          trigger moves into the applicability card below the hero. The
          conditional tier note is retired — entitlement is stated in the hero
          access line instead. */}
      <ProductHero
        geography="gdpr"
        eyebrowLabel={<><BookOpen aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {productEyebrow("ropa")}</>}
        title="Record of Processing Activities (RoPA) Builder"
        valueProposition="Build and maintain an Article 30 RoPA across 25+ privacy frameworks with guided questions, reusable records, and an annual refresh."
        showIntakeCta={false}
      >
        <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
          <Link to={primary.to} onClick={() => fireConversion("subscribe_cta_click", { cta_label: primary.label, cta_position: "hero" })}>
            {primary.label} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        <SampleReportLink toolSlug="ropa" tone="onDark" variant="link" />
      </ProductHero>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <p className="text-sm text-muted-foreground">
          {isAnnual
            ? "Included with your annual plan: first RoPA build plus one refresh each subscription year."
            : isMonthlySub
              ? "Included with your monthly plan at the per-generation rate for each build or update."
              : "Requires an Intelligence or Professional subscription. Annual plans include the first build and one refresh each subscription year; monthly plans are priced per build or update."}
        </p>
      </div>

      <ProductInfoCards
        className="mt-6"
        cards={[
          {
            title: "Does the RoPA requirement apply to you?",
            tone: "amber",
            body: "Article 30 generally requires controllers and processors to maintain processing records; the small-organisation exemption is limited where processing is regular, risky, or involves special-category data.",
          },
          {
            title: "What you receive",
            body: "A regulator-ready processing record covering the required Article 30 fields across 25+ frameworks, with reusable activities and an annual refresh.",
          },
          {
            title: "Why trust it",
            body: "Each framework is mapped to its own recordkeeping requirements, including GDPR Article 30 and the corresponding provisions of every covered law.",
          },
        ]}
      />

      <main className="flex-1 mt-6">

        {/* TRUST BAR */}
        <section className="border-y border-border bg-muted/30 py-6 px-4">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span>25+ frameworks</span>
            <span aria-hidden>·</span>
            <span>PDF / Word / Excel</span>
            <span aria-hidden>·</span>
            <span>Annual refresh workflow</span>

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
              25+ frameworks across six regions
            </h2>
            <p className="text-center text-muted-foreground mb-10 text-sm">
              Coverage by region.
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
              Available with any active subscription — free builds on annual plans, per-generation pricing on monthly plans.
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
            {isAnnual ? "Build your RoPA" : "Build your first RoPA with an annual plan"}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Annual plans include the first build and one refresh each subscription
            year; additional updates are $39. Monthly plans are $49 per build or update.
          </p>
          <Button asChild size="lg">
            <Link
              to={isAnnual ? "/ropa" : "/subscribe"}
              onClick={() => { fireConversion("subscribe_cta_click", { cta_label: isAnnual ? "Open RoPA Builder" : "Choose an annual plan", cta_position: "article-footer" }); fireConversion("tool_start_click", { tool_slug: "ropa", page_path: "/ropa-builder", user_type: userType }); }}
            >
              {isAnnual ? "Open RoPA Builder" : "Choose an annual plan"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>

        </section>
      </main>
      <Footer />
    </div>
  );
}
