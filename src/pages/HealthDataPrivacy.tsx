import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SECTIONS = [
  {
    title: "HIPAA: The Federal Foundation",
    content: `The Health Insurance Portability and Accountability Act (HIPAA) remains the cornerstone of U.S. health data privacy. Its Privacy Rule (45 CFR Part 160 and Subparts A, E of Part 164) and Security Rule govern the use and disclosure of Protected Health Information (PHI) by covered entities (health plans, healthcare providers, healthcare clearinghouses) and their business associates.\n\nKey obligations include:\n• **Minimum Necessary Standard** — access only the PHI reasonably necessary for the intended purpose\n• **Business Associate Agreements (BAAs)** — required for any vendor that creates, receives, maintains, or transmits PHI\n• **Breach Notification Rule** — notify HHS, affected individuals, and potentially media within 60 days of discovering a breach of unsecured PHI\n• **Right of Access** — patients can request copies of their PHI within 30 days\n\nHHS OCR enforces HIPAA through audits, complaint investigations, and civil monetary penalties ranging from $100 to $50,000 per violation (up to $2M annually per violation category).`,
  },
  {
    title: "FTC Health Breach Notification Rule",
    content: `The FTC's Health Breach Notification Rule (16 CFR Part 318) fills a critical gap: it covers health data held by entities NOT subject to HIPAA — including health apps, fitness trackers, and direct-to-consumer health platforms.\n\nIn 2023-2025, the FTC significantly expanded enforcement of this rule:\n• **GoodRx** — $1.5M penalty for sharing health data with advertising platforms without consumer consent\n• **BetterHelp** — $7.8M settlement for sharing therapy session data with Facebook and Snapchat for advertising\n• **Premom** — consent order for sharing fertility data with third-party analytics\n\nThe rule requires notification to the FTC, affected individuals, and prominent media within 60 days of a breach of health data. "Breach" is defined broadly to include unauthorized sharing, not just security incidents.`,
  },
  {
    title: "State Consumer Health Data Laws",
    content: `A new wave of state laws now extends health data protections beyond HIPAA:\n\n**Washington My Health My Data Act (MHMDA)** — Effective March 2024, this is the most comprehensive state health data law. It:\n• Applies to any entity that collects, processes, or shares consumer health data (not limited to covered entities)\n• Requires clear consent before collection or sharing\n• Grants a private right of action (unlike most state privacy laws)\n• Covers reproductive health, mental health, gender-affirming care data, and biometric data\n\n**Nevada SB 370** — Similar consumer health data protections effective 2024.\n\n**Connecticut, Oregon, Montana** — Each includes health data provisions in their comprehensive privacy laws, with varying definitions and consent requirements.\n\n**Reproductive Health Data** — Following the Dobbs decision, multiple states (CA, IL, MD, WA) enacted specific protections for reproductive and sexual health data, restricting law enforcement access and requiring heightened consent for collection.`,
  },
  {
    title: "AI & Health Data: Emerging Obligations",
    content: `The intersection of AI and health data is creating new compliance challenges:\n\n• **HHS AI Strategy** — Voluntary AI frameworks for healthcare, but expect mandatory requirements by 2027\n• **EU AI Act** — Classifies AI systems used in healthcare as "high-risk," requiring conformity assessments, human oversight, and data governance\n• **State AI Health Laws** — Colorado's AI Act (effective 2026) requires impact assessments for AI systems that make consequential decisions in healthcare\n• **De-identification challenges** — AI training on health data raises questions about whether de-identified data can be re-identified, potentially creating HIPAA compliance risks`,
  },
  {
    title: "Enforcement Trends in Health Data Privacy",
    content: `Health data enforcement is accelerating across all levels:\n\n• **HHS OCR** — Record HIPAA enforcement in 2025, with particular focus on right-of-access violations and ransomware-related breach failures\n• **FTC** — Aggressive use of the Health Breach Notification Rule against digital health companies\n• **State AGs** — Multi-state investigations into health data sharing by pharmacies, telehealth platforms, and health apps\n• **Private litigation** — Washington's MHMDA private right of action is generating the first wave of consumer health data class actions\n\nOrganizations processing health data should expect: increased audit frequency, higher penalties, broader definitions of "health data," and growing regulatory attention to AI-driven health applications.`,
  },
];

export default function HealthDataPrivacyPage() {
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("id, title, published_at, source_name, url")
      .or("title.ilike.%HIPAA%,title.ilike.%health data%,title.ilike.%health breach%,topic_tags.cs.{health-data}")
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setRecentUpdates(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws | EndUserPrivacy</title>
        <meta name="description" content="Comprehensive guide to health data privacy covering HIPAA enforcement, FTC Health Breach Notification Rule, Washington MHMDA, state consumer health data laws, and AI in healthcare." />
        <meta property="og:title" content="Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws" />
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/health-data-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws",
          "description": "Comprehensive health data privacy guide for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "EndUserPrivacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <Topbar />
      <Navbar />

      <AdBanner />

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Intelligence Guide</p>
        <h1 className="font-display text-[28px] md:text-[36px] text-foreground leading-tight mb-4">
          Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-10">
          A comprehensive guide to health data privacy obligations covering HIPAA, the FTC Health Breach Notification Rule, state consumer health data laws, and the emerging intersection of AI and healthcare regulation.
        </p>

        <div className="space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={i}>
              <h2 className="font-display text-[20px] text-foreground mb-3">{s.title}</h2>
              <div className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        {recentUpdates.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="font-display text-[18px] text-foreground mb-4">Recent Health Data Privacy Updates</h2>
            <div className="space-y-3">
              {recentUpdates.map(u => (
                <a key={u.id} href={u.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 no-underline transition-all">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{u.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{u.source_name} · {new Date(u.published_at).toLocaleDateString()}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-display text-[18px] text-foreground mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/enforcement-tracker" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">📊 Enforcement Tracker</p>
              <p className="text-[11px] text-muted-foreground">Search health data enforcement actions</p>
            </Link>
            <Link to="/topics/data-breaches" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">🔓 Data Breaches Hub</p>
              <p className="text-[11px] text-muted-foreground">Breach notification requirements</p>
            </Link>
            <Link to="/calendar" className="p-4 rounded-xl border border-border hover:bg-muted/40 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">📅 Compliance Calendar</p>
              <p className="text-[11px] text-muted-foreground">Health data compliance deadlines</p>
            </Link>
            <Link to="/subscribe" className="p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 no-underline transition-all">
              <p className="text-[13px] font-semibold text-foreground">⭐ Get weekly analyst coverage</p>
              <p className="text-[11px] text-muted-foreground">Health & Medical Data track — $20/month</p>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
