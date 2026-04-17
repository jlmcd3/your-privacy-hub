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
    title: "The Global Breach Notification Landscape",
    content: `Data breach notification obligations exist in virtually every major privacy jurisdiction. The core requirement is consistent: when personal data is compromised, organizations must notify affected individuals and/or regulators within a specified timeframe.\n\nHowever, the details — **who must be notified**, **how quickly**, **what triggers notification**, and **what penalties apply** — vary dramatically across jurisdictions. Organizations operating globally must maintain breach response playbooks that account for these differences.`,
  },
  {
    title: "GDPR Breach Notification (Articles 33-34)",
    content: `The GDPR established the benchmark for modern breach notification:\n\n• **72-hour notification to DPA** — controllers must notify the supervisory authority "without undue delay" and within 72 hours of becoming aware of a breach, unless it's unlikely to result in risk to individuals\n• **Communication to data subjects** — required when the breach is likely to result in a "high risk" to individuals' rights and freedoms\n• **Content requirements** — notifications must describe the nature of the breach, categories of data subjects affected, likely consequences, and measures taken\n• **Processor obligations** — processors must notify controllers "without undue delay" after becoming aware of a breach\n\n**Enforcement examples:**\n• **British Airways** — ICO fined £20M for a 2018 breach affecting 400,000+ customers (originally proposed at £183M)\n• **Marriott** — ICO fined £18.4M for Starwood breach affecting 339M guests\n• **Meta/Facebook** — DPC fined €265M for a scraping incident exposing 533M users' data`,
  },
  {
    title: "U.S. State Breach Notification Laws",
    content: `All 50 U.S. states, plus D.C., Guam, Puerto Rico, and the U.S. Virgin Islands, have breach notification laws. Key variations include:\n\n**Notification triggers:**\n• Most states require notification when there is unauthorized **acquisition** of personal information\n• Some states (e.g., California, Florida) use a broader "unauthorized **access**" standard\n• Definition of "personal information" varies — some include biometric data, health data, or online credentials\n\n**Notification timing:**\n• **Most states** — "most expedient time possible" or "without unreasonable delay"\n• **Florida, Colorado, Washington** — 30 days\n• **Ohio, Wisconsin** — 45 days\n• **Connecticut** — 60 days\n\n**AG notification:**\n• Many states require simultaneous notification to the state Attorney General\n• Thresholds vary — some require AG notification for any breach, others only when 500+ or 1,000+ residents are affected\n\n**Private right of action:**\n• **California** — statutory damages of $100-$750 per consumer per incident under CCPA/CPRA for breaches resulting from failure to implement reasonable security\n• Most other states rely on AG enforcement`,
  },
  {
    title: "Sector-Specific U.S. Requirements",
    content: `Federal sector-specific laws impose additional breach notification obligations:\n\n• **HIPAA (Health)** — covered entities must notify HHS, affected individuals, and media (for breaches of 500+) within 60 days of discovery. Business associates must notify covered entities "without unreasonable delay"\n• **GLBA / Interagency Guidance (Financial)** — banking regulators require notification to primary federal regulator within 36 hours for incidents that could impact services\n• **SEC Rules (Public Companies)** — material cybersecurity incidents must be disclosed in Form 8-K within 4 business days of materiality determination\n• **FTC Health Breach Notification Rule** — non-HIPAA entities handling health data must notify FTC and affected individuals within 60 days\n• **FERPA (Education)** — no specific breach notification requirement, but institutions risk losing federal funding for non-compliance`,
  },
  {
    title: "International Breach Notification Requirements",
    content: `Beyond the EU, major international frameworks include:\n\n• **UK GDPR** — mirrors EU GDPR's 72-hour requirement; ICO is the supervisory authority\n• **Canada PIPEDA** — notification required when breach creates a "real risk of significant harm"; must notify Privacy Commissioner and affected individuals "as soon as feasible"\n• **Australia NDB Scheme** — notification to OAIC and affected individuals required for "eligible data breaches" likely to result in serious harm; 30-day assessment period\n• **Brazil LGPD** — notification to ANPD and data subjects required within a "reasonable time" (ANPD recommends 2 business days)\n• **China PIPL** — immediate notification to authorities and affected individuals; specific content requirements including remedial measures\n• **India DPDP Act** — notification to Data Protection Board "without delay" upon awareness; no specific hour requirement yet\n• **Japan APPI** — notification to PPC required for breaches affecting 1,000+ individuals or involving sensitive data`,
  },
  {
    title: "Best Practices for Breach Response",
    content: `1. **Maintain a jurisdiction-mapped breach response playbook** — pre-identify notification requirements for every jurisdiction where you hold personal data\n2. **Establish a 72-hour response capability** — even where not legally required, the GDPR standard has become the de facto global benchmark\n3. **Pre-draft notification templates** — have regulator, individual, and media templates ready to customize\n4. **Define "discovery" internally** — when does your organization "become aware" of a breach? This determination triggers notification clocks\n5. **Engage forensics and legal counsel early** — privilege considerations and forensic evidence preservation are critical\n6. **Document everything** — maintain a breach log regardless of notification obligation; regulators expect documented assessment of all incidents\n7. **Test your response plan annually** — tabletop exercises should include cross-jurisdictional scenarios`,
  },
];

export default function BreachNotificationPage() {
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("id, title, published_at, source_name, url")
      .or("title.ilike.%breach%,title.ilike.%notification%,title.ilike.%incident%,topic_tags.cs.{data-breach}")
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setRecentUpdates(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Data Breach Notification Requirements by Jurisdiction | EndUserPrivacy</title>
        <meta name="description" content="Comprehensive guide to data breach notification laws covering GDPR 72-hour rule, all 50 U.S. state laws, HIPAA, SEC rules, and international requirements across 20+ jurisdictions." />
        <meta property="og:title" content="Data Breach Notification Requirements by Jurisdiction" />
        <meta property="og:description" content="Complete data breach notification compliance guide covering GDPR, U.S. states, and global requirements." />
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/breach-notification" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Data Breach Notification Requirements by Jurisdiction",
          "description": "Comprehensive guide to global data breach notification obligations for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "EndUserPrivacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <Navbar />
      <AdBanner />

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Intelligence Guide</p>
        <h1 className="font-display text-[28px] md:text-[36px] text-foreground leading-tight mb-4">
          Data Breach Notification Requirements by Jurisdiction
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-10">
          A complete reference for privacy professionals on breach notification obligations — from the GDPR's 72-hour rule to all 50 U.S. state laws, sector-specific federal requirements, and international frameworks across 20+ jurisdictions.
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
            <h2 className="font-display text-[18px] text-foreground mb-4">Recent Data Breach & Notification Updates</h2>
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
              <p className="text-[11px] text-muted-foreground">Search breach-related enforcement actions</p>
            </Link>
            <Link to="/health-data-privacy" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">🏥 Health Data Privacy</p>
              <p className="text-[11px] text-muted-foreground">HIPAA breach notification deep dive</p>
            </Link>
            <Link to="/jurisdictions" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">🌍 Jurisdictions Map</p>
              <p className="text-[11px] text-muted-foreground">Explore 150+ privacy law profiles</p>
            </Link>
            <Link to="/subscribe" className="p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">⭐ Get weekly analyst coverage</p>
              <p className="text-[11px] text-muted-foreground">Breach & incident response track — $20/month</p>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
