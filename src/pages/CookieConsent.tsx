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
    title: "What Is Cookie Consent?",
    content: `Cookie consent refers to the legal requirement for websites to obtain users' informed permission before placing non-essential cookies or similar tracking technologies on their devices. This obligation derives from the EU's ePrivacy Directive (2009/136/EC), reinforced by the GDPR, and increasingly mirrored in U.S. state privacy laws.\n\nThe core principle is simple: unless a cookie is "strictly necessary" for the website to function (e.g., session authentication, shopping cart), the website must obtain active, informed consent before setting it. Pre-ticked boxes, implied consent from continued browsing, and "cookie walls" that block access without consent are generally prohibited under EU law.`,
  },
  {
    title: "GDPR & ePrivacy Requirements",
    content: `Under the GDPR (Articles 6, 7) and the ePrivacy Directive (Article 5(3)), websites operating in the EU must:\n\n• **Obtain prior consent** before placing non-essential cookies\n• **Provide clear information** about each cookie's purpose, duration, and data recipients\n• **Make refusal as easy as acceptance** — no dark patterns, no asymmetric button styling\n• **Keep records of consent** that can demonstrate compliance\n• **Allow withdrawal** of consent at any time, as easily as it was given\n\nThe EDPB's Guidelines 05/2020 on Consent further clarify that scrolling or continued use does not constitute valid consent. Multiple DPAs — particularly CNIL, the Austrian DSB, and the Belgian APD — have issued significant fines for cookie consent violations.`,
  },
  {
    title: "U.S. State Cookie & Tracking Laws",
    content: `While no federal U.S. law directly regulates cookies, several state privacy laws impose consent-like requirements for online tracking:\n\n• **California (CPRA/CCPA):** Requires opt-out mechanisms for "sale" or "sharing" of personal information, including through cookies. The CPPA is actively enforcing cookie compliance as part of its broader Privacy Rights Act enforcement.\n• **Colorado, Connecticut, Virginia, Oregon, Texas:** All require honoring universal opt-out mechanisms (Global Privacy Control / GPC) and providing opt-out for targeted advertising, which frequently involves cookies.\n• **California ADMT Rules (April 2026):** New automated decision-making technology rules will extend consent obligations to AI-driven profiling enabled by cookie data.\n\nThe practical effect: any website with U.S. traffic should implement a Consent Management Platform (CMP) that supports both EU-style opt-in consent and U.S.-style opt-out mechanisms.`,
  },
  {
    title: "Enforcement Examples",
    content: `Cookie consent enforcement has been among the most active areas of DPA action:\n\n• **CNIL (France):** Fined Google €150M and Facebook €60M (2022) for making cookie refusal harder than acceptance. Has since issued 100+ formal notices to websites.\n• **Austrian DSB:** Referred multiple complaints against cookie banners to the CJEU, leading to landmark rulings on consent validity.\n• **Belgian APD:** Fined IAB Europe €250K over the TCF framework's legal basis for cookie consent processing.\n• **ICO (UK):** Issued guidance on cookie compliance and has warned over 100 top UK websites about non-compliant banners.\n• **AEPD (Spain):** Has published detailed cookie guidance and fined companies for pre-ticked consent boxes.`,
  },
  {
    title: "Best Practices for Cookie Compliance",
    content: `1. **Implement a certified CMP** that supports both GDPR opt-in and U.S. opt-out models\n2. **Categorize all cookies** as strictly necessary, functional, analytics, or marketing\n3. **Block non-essential cookies by default** until consent is obtained\n4. **Honor Global Privacy Control (GPC)** signals as an opt-out under applicable state laws\n5. **Audit cookie compliance quarterly** — new scripts, SDKs, and tags constantly introduce new cookies\n6. **Document your cookie inventory** including purpose, retention period, and data recipients\n7. **Test consent flows** on mobile and desktop — ensure refusal is as easy as acceptance`,
  },
];

export default function CookieConsentPage() {
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("id, title, published_at, source_name, url")
      .or("title.ilike.%cookie%,title.ilike.%consent%,title.ilike.%CMP%,topic_tags.cs.{adtech-consent}")
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setRecentUpdates(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Cookie Consent Requirements by Jurisdiction | Your Privacy Hub</title>
        <meta name="description" content="Comprehensive guide to cookie consent requirements under GDPR, ePrivacy, CCPA/CPRA, and U.S. state privacy laws. Enforcement examples, best practices, and compliance checklists." />
        <meta property="og:title" content="Cookie Consent Requirements by Jurisdiction" />
        <meta property="og:description" content="Complete cookie consent compliance guide covering GDPR, ePrivacy, and U.S. state laws." />
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/cookie-consent" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cookie Consent Requirements by Jurisdiction",
          "description": "Comprehensive guide to global cookie consent requirements for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "Your Privacy Hub" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <Navbar />

      <AdBanner />

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Intelligence Guide</p>
        <h1 className="font-display text-[28px] md:text-[36px] text-foreground leading-tight mb-4">
          Cookie Consent Requirements by Jurisdiction
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-10">
          Everything privacy professionals need to know about cookie consent obligations under GDPR, the ePrivacy Directive, CCPA/CPRA, and emerging U.S. state laws — with enforcement examples and compliance checklists.
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

        {/* Recent updates */}
        {recentUpdates.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="font-display text-[18px] text-foreground mb-4">Recent Cookie & Consent Updates</h2>
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

        {/* Related links */}
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-display text-[18px] text-foreground mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/enforcement-tracker" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">📊 Enforcement Tracker</p>
              <p className="text-[11px] text-muted-foreground">Search cookie enforcement actions</p>
            </Link>
            <Link to="/topics/adtech" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">🍪 AdTech & Consent Hub</p>
              <p className="text-[11px] text-muted-foreground">All AdTech consent updates</p>
            </Link>
            <Link to="/jurisdictions" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">🌍 Jurisdictions Map</p>
              <p className="text-[11px] text-muted-foreground">Explore 150+ privacy law profiles</p>
            </Link>
            <Link to="/subscribe" className="p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">⭐ Get weekly analyst coverage</p>
              <p className="text-[11px] text-muted-foreground">AdTech & Consent track — $39/month</p>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
