import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Globe2, MapPin, RefreshCw, Shield } from "lucide-react";

import Navbar from "@/components/Navbar";
import { RequirementBadge } from "@/components/RequirementBadge";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { PageHero } from "@/components/PageHero";
import ToolTierNote from "@/components/tools/ToolTierNote";
import { Button } from "@/components/ui/button";
import SampleReportLink from "@/components/SampleReportLink";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";

const US_VIRGINIA_STATES = [
  "Virginia", "Colorado", "Connecticut", "Utah", "Texas", "Oregon",
  "Montana", "Iowa", "Tennessee", "Indiana", "Delaware", "New Hampshire",
  "New Jersey", "Kentucky", "Minnesota", "Rhode Island", "Nebraska",
];

const EU_FRAMEWORKS = [
  { code: "EU_GDPR", name: "EU GDPR" },
  { code: "UK_GDPR", name: "UK GDPR" },
  { code: "CH_FADP", name: "Swiss FADP" },
  { code: "BR_LGPD", name: "Brazil LGPD" },
  { code: "JP_APPI", name: "Japan APPI" },
  { code: "IN_DPDPA", name: "India DPDPA" },
  { code: "ZA_POPIA", name: "South Africa POPIA" },
  { code: "CA_PIPEDA", name: "Canada PIPEDA" },
  { code: "AU_PRIVACY", name: "Australia Privacy Act" },
  { code: "KR_PIPA", name: "South Korea PIPA" },
  { code: "SG_PDPA", name: "Singapore PDPA" },
  { code: "AE_PDPL", name: "UAE PDPL" },
];

export default function NoticeBuilderLanding() {
  useToolStartedOnInteraction("notice_builder");

  const { hasToolAccess } = useSubscriptionTier();
  const usHref = hasToolAccess ? "/us-notices" : "/subscribe";
  const euHref = hasToolAccess ? "/eu-notices" : "/subscribe";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>Privacy Notice Builder · US & EU/Global | End User Privacy</title>
        <meta
          name="description"
          content="One builder, two flows: US state notices (CCPA + 19 more) and EU/Global notices (GDPR, UK GDPR, LGPD, APPI, DPDPA, PIPEDA + more). Included with any subscription."
        />
        <link rel="canonical" href="https://enduserprivacy.com/notice-builder" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ToolTierNote />
        {hasToolAccess && (
          <div className="mt-2 text-meta text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            ✓ Included with your subscription: every US state notice and every EU/Global framework is included at no additional charge.
          </div>
        )}
      </div>

      <PageHero
        chip={<>🌍 Privacy Notice Builder · US & EU/Global · Included with any subscription</>}
        title="Generate your privacy notices: US states and EU/Global frameworks, in one place."
        description="Two guided builders, one workspace. Cover all 20 US state privacy laws and every major non-US framework (GDPR, UK GDPR, LGPD, APPI, DPDPA, POPIA, PIPEDA and more). Included with every Intelligence and Professional subscription (monthly or annual). Not sold as a standalone product."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/subscribe">
              View subscription plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
          >
            <Link to="/notices-ropa">My notice projects</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <SampleReportLink toolSlug="us_notice" label="View a sample US notice" tone="onDark" variant="link" />
          <SampleReportLink toolSlug="eu_notice" label="View a sample EU/Global notice" tone="onDark" variant="link" />
        </div>
      </PageHero>

      <main className="flex-1">
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden /> 20 active US state laws</span>
            <span className="flex items-center gap-2"><Globe2 className="h-4 w-4" aria-hidden /> 12 EU/Global frameworks</span>
            <span className="flex items-center gap-2"><Shield className="h-4 w-4" aria-hidden /> Counsel-grade structure</span>
            <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" aria-hidden /> Annual refresh included</span>
          </div>
        </section>

        <section className="py-14">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif mb-2">Pick your flow</h2>
            <p className="text-muted-foreground mb-8 max-w-3xl">
              Most teams need one or both. You can run them independently or chain them
              from the same workspace; answers pre-populate from your RoPA where applicable.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    <h3 className="font-serif text-xl">US Privacy Notice Builder</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    CCPA/CPRA, Virginia CDPA, Texas TDPSA, Maryland MODPA, Florida FDBR
                    and every active US state framework: one questionnaire, separate
                    notices per state.
                  </p>
                  <RequirementBadge tier="required" text="Required — CCPA notice-at-collection & most US state laws" />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Coverage</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="default" className="font-normal">
                        <Check className="h-3 w-3 mr-1" aria-hidden /> California (CCPA/CPRA)
                      </Badge>
                      {US_VIRGINIA_STATES.slice(0, 6).map((s) => (
                        <Badge key={s} variant="outline" className="font-normal">{s}</Badge>
                      ))}
                      <Badge variant="outline" className="font-normal">
                        + {US_VIRGINIA_STATES.length - 6} more
                      </Badge>
                    </div>
                  </div>
                  <Button asChild className="w-full mt-2">
                    <Link to={usHref}>
                      {hasToolAccess ? "Open US Notice Builder" : "Subscribe to access"}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌍</span>
                    <h3 className="font-serif text-xl">EU & Global Notice Builder</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    GDPR-aligned notices for the EU/EEA, UK, Switzerland and the world's
                    major non-US frameworks — built around Article 13/14 with
                    jurisdiction-specific overlays.
                  </p>
                  <RequirementBadge tier="required" text="Required — GDPR Articles 13–14" />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Frameworks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EU_FRAMEWORKS.slice(0, 8).map((f) => (
                        <Badge key={f.code} variant="outline" className="font-normal">
                          <Check className="h-3 w-3 mr-1" aria-hidden />
                          {f.name}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="font-normal">
                        + {EU_FRAMEWORKS.length - 8} more
                      </Badge>
                    </div>
                  </div>
                  <Button asChild className="w-full mt-2">
                    <Link to={euHref}>
                      {hasToolAccess ? "Open EU/Global Notice Builder" : "Subscribe to access"}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-14 bg-muted/20 border-y border-border">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif mb-8">How it works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { n: "1", title: "Pick your jurisdictions", body: "Select states or frameworks. We surface only the questions that actually apply." },
                { n: "2", title: "Answer once", body: "4–18 questions per jurisdiction. Save and resume any time. RoPA answers pre-fill." },
                { n: "3", title: "Download anywhere", body: "PDF and embeddable HTML, separate notice per jurisdiction." },
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

        <section className="py-16">
          <div className="max-w-[820px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-serif mb-3">Included with any subscription.</h2>
            <p className="text-muted-foreground mb-6">
              Subscribe to Intelligence or Professional (monthly or annual) to access
              both the US and EU/Global notice builders at no additional charge.
            </p>
            <Button asChild size="lg">
              <Link to="/subscribe">
                View subscription plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
