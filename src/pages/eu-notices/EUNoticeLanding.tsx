import { PageHero } from "@/components/PageHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Globe2, ShieldCheck, FileText, Clock, CheckCircle2 } from "lucide-react";
import ToolTierNote from "@/components/tools/ToolTierNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { EU_NOTICE_PRICING } from "@/config/pricing";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";

const FRAMEWORKS = [
  { code: "EU_GDPR", name: "EU GDPR", region: "EU/EEA" },
  { code: "UK_GDPR", name: "UK GDPR", region: "United Kingdom" },
  { code: "CH_FADP", name: "Swiss FADP", region: "Switzerland" },
  { code: "BR_LGPD", name: "Brazil LGPD", region: "Americas" },
  { code: "JP_APPI", name: "Japan APPI", region: "Asia-Pacific" },
  { code: "IN_DPDPA", name: "India DPDPA", region: "Asia-Pacific" },
  { code: "ZA_POPIA", name: "South Africa POPIA", region: "Africa" },
  { code: "CA_PIPEDA", name: "Canada PIPEDA", region: "Americas" },
  { code: "AU_PRIVACY", name: "Australia Privacy Act", region: "Asia-Pacific" },
  { code: "KR_PIPA", name: "South Korea PIPA", region: "Asia-Pacific" },
  { code: "SG_PDPA", name: "Singapore PDPA", region: "Asia-Pacific" },
  { code: "AE_PDPL", name: "UAE PDPL", region: "Middle East" },
];

export default function EUNoticeLanding() {
  const { hasToolAccess } = useSubscriptionTier();
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType = user ? "authenticated" : "anonymous";
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>EU & Global Privacy Notice Builder | EndUserPrivacy</title>
        <meta name="description" content="Generate GDPR, UK GDPR, Swiss FADP, LGPD, APPI, DPDPA, POPIA, PIPEDA and 4 more privacy notices in one session." />
        <link rel="canonical" href="https://enduserprivacy.com/eu-global-notice-builder" />
      </Helmet>      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ToolTierNote />
        {hasToolAccess && (
          <div className="mt-2 text-meta text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            ✓ Included in your Annual Platform: every EU & global privacy notice framework is included at no additional charge.
          </div>
        )}
      </div>
      <PageHero
        chip={<>🌐 EU & Global Notice Builder · Included with any subscription</>}
        title="EU & Global Privacy Notice Builder"
        description="Build privacy notices for GDPR, UK GDPR, Swiss FADP, LGPD, APPI, DPDPA, POPIA and 5 more frameworks, in a single guided session. Included with every Intelligence and Professional subscription (monthly or annual). Not sold as a standalone product."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View subscription plans", cta_position: "hero" })}>View subscription plans <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white"
          >
            <Link to="/eu-notices" onClick={() => fireConversion("tool_start_click", { tool_slug: "eu_notice", page_path: "/eu-notice-builder", user_type: userType })}>My notice projects</Link>
          </Button>
        </div>
      </PageHero>
      <main className="flex-1">

        <section className="py-12">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif mb-6">Supported frameworks</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {FRAMEWORKS.map((f) => (
                <Card key={f.code}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{f.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.region}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-muted/30 border-y border-border">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <Globe2 className="h-6 w-6 text-primary mb-3" />
                <h3 className="mb-1">One session, every notice</h3>
                <p className="text-sm text-muted-foreground">Answer questions once. Get a separate notice per framework, plus an optional combined international notice.</p>
              </div>
              <div>
                <ShieldCheck className="h-6 w-6 text-primary mb-3" />
                <h3 className="mb-1">Counsel-grade structure</h3>
                <p className="text-sm text-muted-foreground">Structured around GDPR Art. 13/14 with framework-specific overlays for each jurisdiction.</p>
              </div>
              <div>
                <Clock className="h-6 w-6 text-primary mb-3" />
                <h3 className="mb-1">Annual refresh built in</h3>
                <p className="text-sm text-muted-foreground">When the law changes, refresh in minutes; your prior answers carry forward.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-primary mb-4" />
            <h2 className="font-serif mb-3">Included with any subscription.</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Subscribe to Intelligence or Professional (monthly or annual) to access the
              EU &amp; Global Privacy Notice Builder for every supported framework at no additional charge.
            </p>
            <Button asChild size="lg">
              <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "View subscription plans", cta_position: "article-footer" })}>View subscription plans <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
