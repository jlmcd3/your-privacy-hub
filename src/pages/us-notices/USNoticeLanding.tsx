import { PageHero } from "@/components/PageHero";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import ToolTierNote from "@/components/tools/ToolTierNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Check, Shield, RefreshCw, MapPin } from "lucide-react";
import { US_NOTICE_PRICING, INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

const VIRGINIA_STATES = [
  "Virginia", "Colorado", "Connecticut", "Utah", "Texas", "Oregon",
  "Montana", "Iowa", "Tennessee", "Indiana", "Delaware", "New Hampshire",
  "New Jersey", "Kentucky", "Minnesota", "Rhode Island", "Nebraska",
];

const PENDING_STATES = ["Kentucky (eff. 2026)", "Rhode Island (eff. 2026)"];

const PRICING_ROWS: Array<{ feature: string; free: string; sub: string; platform: string }> = [
  { feature: "Answer all questions", free: "Subscribers only", sub: "✓", platform: "✓" },
  { feature: "Save & resume", free: "Subscribers only", sub: "✓", platform: "✓" },
  { feature: "Pre-population from RoPA", free: "Subscribers only", sub: "✓", platform: "✓" },
  { feature: "Single state notice", free: "Subscribers only", sub: "Included", platform: "Included" },
  { feature: "All 20 states", free: "Subscribers only", sub: "Included", platform: "Included" },
  { feature: "Annual refresh", free: "Subscribers only", sub: "Included", platform: "Included" },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Do I legally need a US privacy notice?",
    a: "Yes, if your business meets the applicability threshold for any active state law. Texas has no consumer-volume threshold — any non-small business processing Texas residents' data may be covered.",
  },
  {
    q: "What's the Virginia model?",
    a: "17 states share a common notice structure based on the Virginia Consumer Data Protection Act. We ask the questions once and generate separate notices for each selected state.",
  },
  {
    q: "How is CCPA different?",
    a: "California has its own distinct framework with unique concepts like 'sensitive personal information', financial incentive notices, and the CPPA as a dedicated enforcement agency.",
  },
  {
    q: "Can I add the notice to my website?",
    a: "Yes — every notice is generated as embeddable HTML you can paste into any page, plus PDF and Word versions for review and records.",
  },
  {
    q: "What happens when state laws change?",
    a: "Annual refresh detects regulatory changes affecting your states and pre-fills your previous answers. You only re-answer what's actually changed.",
  },
  {
    q: "Is my data secure?",
    a: "Your notice content is processed securely and stored in your private workspace. It is not shared with third parties or sold.",
  },
];

export default function USNoticeLanding() {
  const { hasToolAccess } = useSubscriptionTier();
  useEffect(() => {
    document.title =
      "US Privacy Notice Builder — CCPA, Virginia, Texas & All 20 States | End User Privacy";
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute(
      "content",
      "Generate privacy notices for all 20 US state privacy laws in one session. CCPA/CPRA, Virginia CDPA, Texas TDPSA, and more. Pre-populated from your RoPA.",
    );
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <WorkspaceLayout className="bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ToolTierNote />
        {hasToolAccess && (
          <div className="mt-2 text-meta text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            ✓ Included in your Annual Platform — every US state privacy notice is included at no additional charge.
          </div>
        )}
      </div>
      <PageHero
        chip={<>📋 US Privacy Notice Builder · Included with any subscription</>}
        title="Generate US privacy notices for all 20 states — in one session."
        description="Covers CCPA/CPRA, Virginia CDPA, Texas TDPSA, and every active US state privacy law. Pre-populated from your RoPA. Included with every Intelligence and Professional subscription — monthly or annual. Not sold as a standalone product."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="min-h-[48px]">
            <Link to="/subscribe">
              View subscription plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-h-[48px] bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
          >
            <Link to="/us-notices">View my notice projects</Link>
          </Button>
        </div>
      </PageHero>
      <main className="flex-1">

        {/* TRUST BAR */}
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden /> 20 active state laws
            </span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" aria-hidden /> CCPA separate from Virginia model
            </span>
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden /> Annual refresh included
            </span>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 md:py-20">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-foreground mb-10">
              How it works
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "1",
                  title: "Select your states",
                  body: "Choose the states where your customers live. We surface the laws that actually apply to you.",
                },
                {
                  n: "2",
                  title: "Answer state-specific questions",
                  body: "4 to 18 questions per framework. Save and resume any time. RoPA users get most answers pre-filled.",
                },
                {
                  n: "3",
                  title: "Download in any format",
                  body: "Get your notices as PDF, Word, or embeddable HTML — ready to publish on your site.",
                },
              ].map((step) => (
                <Card key={step.n}>
                  <CardContent className="p-6">
                    <div className="font-serif text-3xl text-primary mb-3">{step.n}</div>
                    <h3 className="mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* STATE COVERAGE */}
        <section className="py-16 md:py-20 border-t border-border bg-muted/20">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-foreground mb-2">
              State coverage
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Every active US state privacy law, organised by framework — so you only
              answer the questions that actually apply to your business.
            </p>
            <div className="space-y-6">
              <CoverageGroup
                title="California"
                tag="CCPA/CPRA — Unique Framework"
                items={["California"]}
                emphasized
              />
              <CoverageGroup
                title={`Virginia model (${VIRGINIA_STATES.length} states)`}
                tag="Shared notice structure"
                items={VIRGINIA_STATES}
              />
              <CoverageGroup
                title="Maryland"
                tag="Stricter — data minimisation requirement"
                items={["Maryland (MODPA)"]}
              />
              <CoverageGroup
                title="Florida"
                tag="Very narrow scope — $1B+ revenue only"
                items={["Florida (FDBR)"]}
              />
              <div>
                <h3 className="text-foreground mb-3">Pending states</h3>
                <div className="flex flex-wrap gap-2">
                  {PENDING_STATES.map((s) => (
                    <Badge key={s} variant="secondary" className="opacity-60">
                      {s} · Coming soon
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-16 md:py-20">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-foreground mb-2">
              Pricing
            </h2>
            <p className="text-muted-foreground mb-8">
              Included with any active Intelligence or Professional subscription — monthly or annual. Not sold as a standalone product.
            </p>
            <Card>
              <CardContent className="cmp-table p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-medium"></th>
                      <th className="text-left p-4 font-medium">Free</th>
                      <th className="text-left p-4 font-medium">
                        Intelligence Plan{" "}
                        <span className="text-muted-foreground font-normal">({INTELLIGENCE_PRICING.monthlyShort()})</span>
                      </th>
                      <th className="text-left p-4 font-medium">
                        Platform{" "}
                        <span className="text-muted-foreground font-normal">({PLATFORM_PRICING.standard()})</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRICING_ROWS.map((row) => (
                      <tr key={row.feature} className="border-b border-border last:border-b-0">
                        <td className="p-4 text-foreground">{row.feature}</td>
                        <td className="p-4">{row.free}</td>
                        <td className="p-4 font-medium">{row.sub}</td>
                        <td className="p-4 font-medium text-green-700">{row.platform}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20 border-t border-border bg-muted/20">
          <div className="max-w-[820px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-foreground mb-8">
              Frequently asked
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="py-16 md:py-20 border-t border-border">
          <div className="max-w-[820px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-serif text-foreground mb-4">
              Included with any subscription.
            </h2>
            <p className="text-muted-foreground mb-8">
              Subscribe to Intelligence or Professional — monthly or annual — to access the
              US Privacy Notice Builder for every active state at no additional charge.
            </p>
            <Button asChild size="lg" className="min-h-[48px]">
              <Link to="/subscribe">
                View subscription plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </WorkspaceLayout>
  );
}

function CoverageGroup({
  title,
  tag,
  items,
  emphasized,
}: {
  title: string;
  tag: string;
  items: string[];
  emphasized?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2 mb-3">
        <h3 className="text-foreground">
          {title}
        </h3>
        <span className="text-xs text-muted-foreground italic">— {tag}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <Badge
            key={s}
            variant={emphasized ? "default" : "outline"}
            className="font-normal"
          >
            <Check className="h-3 w-3 mr-1" aria-hidden />
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
