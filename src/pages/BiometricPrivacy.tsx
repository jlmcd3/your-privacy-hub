import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";

const SECTIONS = [
  {
    title: "What Is Biometric Data?",
    content: `Biometric data refers to physiological or behavioral characteristics used to identify individuals — including fingerprints, facial geometry, iris scans, voiceprints, gait analysis, and keystroke dynamics. As biometric technologies become embedded in consumer devices, workplace systems, and public surveillance, a patchwork of laws has emerged to regulate their collection, use, and storage.\n\nThe regulatory landscape is defined by two forces: **state-level biometric privacy statutes** (led by Illinois' BIPA) and **broader privacy laws** that include biometric data within their definitions of sensitive personal information.`,
  },
  {
    title: "Illinois BIPA: The Gold Standard",
    content: `The Illinois Biometric Information Privacy Act (740 ILCS 14) remains the most consequential biometric privacy law in the world. Enacted in 2008, BIPA requires:\n\n• **Written informed consent** before collecting biometric identifiers or information\n• **A publicly available retention and destruction policy** specifying when biometric data will be permanently deleted\n• **No sale, lease, or trade** of biometric data\n• **Reasonable security measures** to protect stored biometric data\n\nBIPA's **private right of action** is its most powerful feature — individuals can sue for $1,000 per negligent violation and $5,000 per intentional or reckless violation. In 2023, the Illinois Supreme Court ruled in **Cothron v. White Castle** that damages accrue with each scan or transmission, not just the first, exponentially increasing exposure.\n\nMajor settlements include:\n• **Facebook/Meta** — $650M (2021)\n• **Google** — $100M (2022)\n• **BNSF Railway** — $228M jury verdict (2022)\n• **White Castle** — estimated $17B+ exposure (pending resolution)`,
  },
  {
    title: "Texas & Washington Biometric Laws",
    content: `**Texas CUBI (Tex. Bus. & Com. Code § 503.001):** Enacted in 2009, Texas prohibits capturing biometric identifiers for commercial purposes without informed consent. Unlike BIPA, enforcement was limited to the Attorney General — until 2024, when AG Ken Paxton secured a **$1.4B settlement from Meta** for unauthorized facial recognition data collection through Facebook's tag suggestions feature.\n\n**Washington Biometric Privacy (RCW 19.375):** Washington's 2017 law prohibits enrolling biometric identifiers in a database for a commercial purpose without consent. It does not include a private right of action, relying on AG enforcement and the state Consumer Protection Act.`,
  },
  {
    title: "Comprehensive Privacy Laws & Biometric Data",
    content: `Nearly every comprehensive state privacy law classifies biometric data as **sensitive personal information** requiring heightened protections:\n\n• **California (CPRA):** Biometric data is a category of sensitive PI requiring opt-in consent for processing beyond what's necessary for the service\n• **Colorado, Connecticut, Virginia, Oregon, Montana, Texas:** All require opt-in consent before processing biometric data\n• **EU GDPR (Article 9):** Biometric data processed for identification is a "special category" requiring explicit consent or another Article 9 lawful basis\n• **EU AI Act:** Biometric identification systems in public spaces are largely prohibited, with narrow law enforcement exceptions\n\nThe practical effect: any organization using biometric authentication, facial recognition, or voice identification must navigate a complex, jurisdiction-specific consent and governance framework.`,
  },
  {
    title: "Workplace Biometric Use",
    content: `Biometric timekeeping, access control, and identity verification in the workplace are among the highest-risk use cases:\n\n• **BIPA litigation** is dominated by workplace claims — fingerprint time clocks, facial recognition entry systems, and palm scanners\n• **EEOC guidance** warns that biometric screening tools may create disparate impact liability under Title VII\n• **ADA considerations** arise when biometric systems fail to accommodate individuals with disabilities\n• **Union considerations** — NLRB has indicated that implementation of biometric monitoring may be a mandatory subject of bargaining`,
  },
  {
    title: "Enforcement & Litigation Trends",
    content: `Biometric privacy enforcement is accelerating:\n\n• **BIPA class actions** remain the dominant litigation vector, with hundreds of active cases in Illinois state and federal courts\n• **State AG enforcement** is expanding — Texas' $1.4B Meta settlement signals a new era of AG-driven biometric enforcement\n• **FTC actions** — the FTC has brought enforcement actions against Rite Aid (facial recognition) and Amazon (Alexa voice data), signaling federal interest\n• **EU enforcement** — Clearview AI fined €20M+ by multiple DPAs (France, Italy, UK, Greece) for scraping facial images\n\nOrganizations should expect: more states adopting biometric-specific laws, increased private litigation, and growing regulatory scrutiny of AI-powered biometric systems.`,
  },
];

export default function BiometricPrivacyPage() {
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("id, title, published_at, source_name, url")
      .or("title.ilike.%biometric%,title.ilike.%facial recognition%,title.ilike.%BIPA%,topic_tags.cs.{biometric}")
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setRecentUpdates(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Biometric Privacy Laws: BIPA, State Laws & GDPR | EndUserPrivacy</title>
        <meta name="description" content="Comprehensive guide to biometric privacy laws including Illinois BIPA, Texas CUBI, state comprehensive privacy laws, GDPR Article 9, and workplace biometric compliance." />
        <meta property="og:title" content="Biometric Privacy Laws: BIPA, State Laws & GDPR" />
        <meta property="og:description" content="Complete biometric privacy compliance guide covering BIPA litigation, state laws, and EU regulation." />
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/biometric-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Biometric Privacy Laws: BIPA, State Laws & GDPR",
          "description": "Comprehensive guide to biometric privacy laws for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "EndUserPrivacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <Navbar />
      <AdBanner />

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Intelligence Guide</p>
        <h1 className="font-display text-[28px] md:text-[36px] text-foreground leading-tight mb-4">
          Biometric Privacy Laws: BIPA, State Laws & GDPR
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-10">
          Everything privacy professionals need to know about biometric data regulation — from Illinois BIPA's landmark private right of action to GDPR Article 9, workplace compliance, and the latest enforcement trends.
        </p>

        <div className="space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={i}>
              <h2 className="font-display text-[20px] text-foreground mb-3">{s.title}</h2>
              <div
                className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-line prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: s.content.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>') }}
              />
            </section>
          ))}
        </div>

        {recentUpdates.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="font-display text-[18px] text-foreground mb-4">Recent Biometric Privacy Updates</h2>
            <div className="divide-y divide-border">
              {recentUpdates.map(u => (
                <ArticleCard
                  key={u.id}
                  item={{ id: u.id, title: u.title, source_name: u.source_name, published_at: u.published_at, source_url: u.url } as ArticleItem}
                  variant="compact"
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-display text-[18px] text-foreground mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/enforcement-tracker" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">📊 Enforcement Tracker</p>
              <p className="text-[11px] text-muted-foreground">Search biometric enforcement actions</p>
            </Link>
            <Link to="/us-privacy-laws" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">🇺🇸 U.S. Privacy Laws</p>
              <p className="text-[11px] text-muted-foreground">Compare biometric provisions across states</p>
            </Link>
            <Link to="/ai-privacy-regulations" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">🤖 AI Privacy Regulations</p>
              <p className="text-[11px] text-muted-foreground">AI-powered biometric systems regulation</p>
            </Link>
            <Link to="/subscribe" className="p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">⭐ Get weekly analyst coverage</p>
              <p className="text-[11px] text-muted-foreground">Biometric privacy track — $20/month</p>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
