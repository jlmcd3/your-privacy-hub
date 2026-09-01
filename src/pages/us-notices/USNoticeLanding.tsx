import { productEyebrow } from "@/config/productEyebrow";
import { ProductHero } from "@/components/ProductHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Check, ClipboardList } from 'lucide-react';
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";
import {
  US_STATE_COUNT,
  virginiaModelStates,
  pendingStateLabels,
} from "@/data/usStateNoticeCoverage";

// Coverage counts and state lists derive from the shared registry that also
// drives the builder itself — never hand-typed here (see usStateNoticeCoverage).
const VIRGINIA_STATES = virginiaModelStates().map((s) => s.name);

const PENDING_STATES = pendingStateLabels();

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Do I legally need a US privacy notice?",
    a: "You do if your business meets the applicability threshold for an active state law, and thresholds differ by state. Use the free scope checker to see which laws reach your business before you build notices.",
  },
  {
    q: "What's the Virginia model?",
    a: "Several states share a common notice structure based on the Virginia Consumer Data Protection Act. Common structures let you answer overlapping questions once while still generating a state-specific notice for each state you select.",
  },
  {
    q: "How is CCPA different?",
    a: "California uses its own CCPA/CPRA notice framework, so the builder asks California-specific questions and generates a separate notice where needed.",
  },
  {
    q: "Can I add the notice to my website?",
    a: "Yes — export PDF or Word, or copy embeddable HTML for your site.",
  },
  {
    q: "What happens when state laws change?",
    a: "Annual refresh carries your prior answers forward so you only revisit the fields you need to update for the states you cover.",
  },
  {
    q: "Is my data secure?",
    a: "Your notice content is processed securely and stored in your private workspace. It is not shared with third parties or sold.",
  },
];

export default function USNoticeLanding() {
  const { hasToolAccess } = useSubscriptionTier();
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType = user ? "authenticated" : "anonymous";
  useEffect(() => {
    document.title =
      "US Privacy Notice Builder | End User Privacy";
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute(
      "content",
      `Generate privacy notices for all ${US_STATE_COUNT} US state privacy laws in one session. CCPA/CPRA, Virginia CDPA, Texas TDPSA, and more. Pre-populated from your RoPA.`,
    );
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <ProductHero
        geography="us"
        eyebrowLabel={<><ClipboardList aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {productEyebrow("us_notice")}</>}
        title="US Privacy Notice Builder"
        valueProposition="Generate publish-ready privacy notices for every active U.S. state privacy law in one guided session."
        citationLine="State-specific disclosures mapped to each law's notice requirements"
        showIntakeCta={false}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-emerald-300">
            {hasToolAccess
              ? "Included with your plan — no additional charge."
              : "Included with Intelligence and Professional subscriptions."}
          </p>
          <div className="flex flex-wrap gap-3">
            {hasToolAccess ? (
              <>
                <Button asChild size="lg" className="min-h-[48px]">
                  <Link to="/us-notices" onClick={() => fireConversion("tool_start_click", { tool_slug: "us_notice", page_path: "/us-notice-builder", user_type: userType })}>
                    Open Notice Builder <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-[48px] bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
                >
                  <Link to="/us-notices">My notice projects</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="min-h-[48px]">
                  <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View plans", cta_position: "hero" })}>
                    View plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-[48px] bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
                >
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </ProductHero>
      <main className="flex-1">

        {/* SELLING CARDS */}
        <ProductInfoCards
          className="mt-6"
          cards={[
            {
              title: "All active state laws",
              body: `Coverage for every active U.S. state privacy framework, including California's separate CCPA/CPRA notice.`,
            },
            {
              title: "Answer once, reuse",
              body: "Overlapping questions are answered once and reused across similar frameworks, with state-specific notices generated separately.",
            },
            {
              title: "PDF / Word / embeddable HTML",
              body: "Export for review and records, or copy the HTML straight into your site.",
            },
            {
              title: "Annual refresh + RoPA pre-fill",
              body: "Prior answers carry forward at refresh, and RoPA data pre-fills available fields.",
            },
          ]}
        />


        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-12 md:py-14">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-foreground mb-8">
              How it works
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "1",
                  title: "Select states",
                  body: "We surface the laws relevant to the states you serve.",
                },
                {
                  n: "2",
                  title: "Answer once",
                  body: "State-specific questions appear only where needed; RoPA data pre-fills available fields.",
                },
                {
                  n: "3",
                  title: "Publish",
                  body: "Download PDF or Word, or copy embeddable HTML.",
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


        {/* COVERAGE BY FRAMEWORK */}
        <section className="py-16 md:py-20 border-t border-border bg-muted/20">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-foreground mb-2">
              Coverage by framework
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl">
              Every active state privacy framework, grouped so common answers can be reused.
            </p>
            <details className="group">
              <summary className="cursor-pointer list-none text-sm text-primary underline underline-offset-2">
                See coverage detail
              </summary>
              <div className="space-y-6 mt-6">
                <CoverageGroup
                  title="California"
                  tag="CCPA/CPRA · unique framework"
                  items={["California"]}
                  emphasized
                />
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 mb-3">
                    <h3 className="text-foreground">Virginia-model states ({VIRGINIA_STATES.length})</h3>
                    <span className="text-xs text-muted-foreground italic">— shared notice structure</span>
                  </div>
                  <details>
                    <summary className="cursor-pointer list-none text-sm text-primary underline underline-offset-2">
                      Show states
                    </summary>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {VIRGINIA_STATES.map((s) => (
                        <Badge key={s} variant="outline" className="font-normal">
                          <Check className="h-3 w-3 mr-1" aria-hidden />
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </details>
                </div>
                <CoverageGroup
                  title="Maryland"
                  tag="stricter minimisation requirements"
                  items={["Maryland (MODPA)"]}
                />
                <CoverageGroup
                  title="Florida"
                  tag="narrower applicability"
                  items={["Florida (FDBR)"]}
                />
                {PENDING_STATES.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-3">Not yet in effect</h3>
                  <div className="flex flex-wrap gap-2">
                    {PENDING_STATES.map((s) => (
                      <Badge key={s} variant="secondary" className="opacity-60">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </details>
          </div>
        </section>


        {/* ACCESS & PLANS */}
        <section className="py-16 md:py-20">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-foreground mb-2">
              Access &amp; plans
            </h2>
            <p className="text-muted-foreground mb-8">
              Included with active Intelligence and Professional subscriptions. No per-notice charge.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-1">Intelligence</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {INTELLIGENCE_PRICING.monthlyShort()} — the lower-friction way in for a single organisation.
                  </p>
                  <Button asChild variant="outline" className="min-h-[44px]">
                    <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "Get Intelligence", cta_position: "pricing" })}>
                      Get Intelligence <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-1">Professional</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {PLATFORM_PRICING.standard()} — for teams and advisers managing multiple clients.
                  </p>
                  <Button asChild className="min-h-[44px]">
                    <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View plans", cta_position: "pricing" })}>
                      View plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              All covered states · save/resume · RoPA pre-fill · annual refresh · PDF / Word / HTML.{" "}
              <Link to="/subscribe" className="underline">Compare plans</Link>.
            </p>
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
              One subscription. Every covered US notice.
            </h2>
            <p className="text-muted-foreground mb-8">
              Unlock the US Privacy Notice Builder with Intelligence or Professional and
              generate notices for all covered states at no per-notice charge.
            </p>
            {hasToolAccess ? (
              <Button asChild size="lg" className="min-h-[48px]">
                <Link to="/us-notices" onClick={() => fireConversion("tool_start_click", { tool_slug: "us_notice", page_path: "/us-notice-builder", user_type: userType })}>
                  Open Notice Builder <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="min-h-[48px]">
                <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View plans", cta_position: "article-footer" })}>
                  View plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </div>
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
