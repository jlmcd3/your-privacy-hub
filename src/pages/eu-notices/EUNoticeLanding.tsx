import { productEyebrow } from "@/config/productEyebrow";
import { ProductHero } from "@/components/ProductHero";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, FileText, CheckCircle2, Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SampleReportLink from "@/components/SampleReportLink";

import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";
import {
  EU_NOTICE_FRAMEWORK_COUNT,
  frameworksByRegion,
} from "@/data/euNoticeFrameworks";

export default function EUNoticeLanding() {
  const { hasToolAccess } = useSubscriptionTier();
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType = user ? "authenticated" : "anonymous";
  const regions = frameworksByRegion();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>EU / Global Privacy Notice | EndUserPrivacy</title>
        <meta name="description" content={`One guided intake. Privacy notices for GDPR, UK GDPR and ${EU_NOTICE_FRAMEWORK_COUNT - 2}+ more global frameworks, with jurisdiction-specific disclosures built in.`} />
        <link rel="canonical" href="https://enduserprivacy.com/eu-global-notice-builder" />
      </Helmet>
      {/* PRE-INTAKE REDESIGN: the two stacked entitlement banners above the H1
          are retired — access state lives inside the hero and drives the CTA. */}
      <ProductHero
        geography="global"
        eyebrowLabel={<><Globe aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {productEyebrow("eu_notice")}</>}
        title="EU / Global Privacy Notice"
        showIntakeCta={false}
        valueProposition={`One guided intake. Privacy notices for GDPR, UK GDPR, and ${EU_NOTICE_FRAMEWORK_COUNT - 2}+ global frameworks — with jurisdiction-specific disclosures built in.`}
        citationLine="GDPR Arts. 13–14 and equivalent notice requirements mapped across every supported framework"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-emerald-300">
            {hasToolAccess
              ? "Included with your plan — no additional charge."
              : "Included with Intelligence and Professional subscriptions."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {hasToolAccess ? (
              <>
                <Button asChild size="lg">
                  <Link to="/eu-notices" onClick={() => fireConversion("tool_start_click", { tool_slug: "eu_notice", page_path: "/eu-notice-builder", user_type: userType })}>Open Notice Builder <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
                >
                  <Link to="/eu-notices">My notice projects</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View plans", cta_position: "hero" })}>View plans <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
                >
                  <a href="#framework-coverage">See supported frameworks</a>
                </Button>
              </>
            )}
            <SampleReportLink toolSlug="eu_notice" label="View a sample notice" tone="onDark" variant="link" />
          </div>
        </div>
      </ProductHero>
      <main className="flex-1">

        {/* VALUE CARDS — promoted above the framework list */}
        <ProductInfoCards
          className="mt-6"
          cards={[
            {
              title: "One intake, multiple notices",
              body: "Answer shared questions once; receive framework-specific outputs and, where supported, a combined international notice.",
            },
            {
              title: "Framework-specific structure",
              body: "GDPR Arts. 13–14 form the baseline, with jurisdiction overlays where requirements differ.",
            },
            {
              title: "Refresh instead of rebuilding",
              body: "Prior answers carry forward when you update notices, so you only revisit what changed.",
            },
          ]}
        />

        {/* FRAMEWORK COVERAGE — grouped by region, sourced from the registry */}
        <section id="framework-coverage" className="py-12">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif mb-2">Framework coverage</h2>
            <p className="text-muted-foreground mb-6">
              {EU_NOTICE_FRAMEWORK_COUNT} supported frameworks across {regions.length} regions.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {regions.map((g) => (
                <Card key={g.region}>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      {g.region}
                    </div>
                    <ul className="space-y-1">
                      {g.frameworks.map((f) => (
                        <li key={f.code} className="flex items-center gap-2 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />
                          {f.name}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-primary mb-4" aria-hidden />
            <h2 className="font-serif mb-3">One subscription. Notices across your global footprint.</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Included with active Intelligence and Professional subscriptions. Build notices
              across every supported framework without a per-notice charge.
            </p>
            {hasToolAccess ? (
              <Button asChild size="lg">
                <Link to="/eu-notices" onClick={() => fireConversion("tool_start_click", { tool_slug: "eu_notice", page_path: "/eu-notice-builder", user_type: userType })}>Open Global Notice Builder <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View plans", cta_position: "article-footer" })}>View plans <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              The <Link to="/us-notice-builder" className="underline">US Notice Builder</Link> is included too.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
