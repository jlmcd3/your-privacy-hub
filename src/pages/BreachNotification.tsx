import { Helmet } from "react-helmet-async";
import PillarPage from "@/components/PillarPage";

const SECTIONS = [
  {
    heading: "The Global Breach Notification Landscape",
    content: `Data breach notification obligations exist in virtually every major privacy jurisdiction. The core requirement is consistent: when personal data is compromised, organizations must notify affected individuals and/or regulators within a specified timeframe.\n\nHowever, the details — **who must be notified**, **how quickly**, **what triggers notification**, and **what penalties apply** — vary dramatically across jurisdictions. Organizations operating globally must maintain breach response playbooks that account for these differences.`,
  },
  {
    heading: "GDPR Breach Notification (Articles 33-34)",
    content: `The GDPR established the benchmark for modern breach notification:\n\n• **72-hour notification to DPA** — controllers must notify the supervisory authority "without undue delay" and within 72 hours of becoming aware of a breach, unless it's unlikely to result in risk to individuals\n• **Communication to data subjects** — required when the breach is likely to result in a "high risk" to individuals' rights and freedoms\n• **Content requirements** — notifications must describe the nature of the breach, categories of data subjects affected, likely consequences, and measures taken\n• **Processor obligations** — processors must notify controllers "without undue delay" after becoming aware of a breach\n\n**Enforcement examples:**\n• **British Airways** — ICO fined £20M for a 2018 breach affecting 400,000+ customers (originally proposed at £183M)\n• **Marriott** — ICO fined £18.4M for Starwood breach affecting 339M guests\n• **Meta/Facebook** — DPC fined €265M for a scraping incident exposing 533M users' data`,
  },
  {
    heading: "U.S. State Breach Notification Laws",
    content: `All 50 U.S. states, plus D.C., Guam, Puerto Rico, and the U.S. Virgin Islands, have breach notification laws. Key variations include:\n\n**Notification triggers:**\n• Most states require notification when there is unauthorized **acquisition** of personal information\n• Some states (e.g., California, Florida) use a broader "unauthorized **access**" standard\n• Definition of "personal information" varies — some include biometric data, health data, or online credentials\n\n**Notification timing:**\n• **Most states** — "most expedient time possible" or "without unreasonable delay"\n• **Florida, Colorado, Washington** — 30 days\n• **Ohio, Wisconsin** — 45 days\n• **Connecticut** — 60 days\n\n**AG notification:**\n• Many states require simultaneous notification to the state Attorney General\n• Thresholds vary — some require AG notification for any breach, others only when 500+ or 1,000+ residents are affected\n\n**Private right of action:**\n• **California** — statutory damages of $100-$750 per consumer per incident under CCPA/CPRA for breaches resulting from failure to implement reasonable security\n• Most other states rely on AG enforcement`,
  },
  {
    heading: "Sector-Specific U.S. Requirements",
    content: `Federal sector-specific laws impose additional breach notification obligations:\n\n• **HIPAA (Health)** — covered entities must notify HHS, affected individuals, and media (for breaches of 500+) within 60 days of discovery. Business associates must notify covered entities "without unreasonable delay"\n• **GLBA / Interagency Guidance (Financial)** — banking regulators require notification to primary federal regulator within 36 hours for incidents that could impact services\n• **SEC Rules (Public Companies)** — material cybersecurity incidents must be disclosed in Form 8-K within 4 business days of materiality determination\n• **FTC Health Breach Notification Rule** — non-HIPAA entities handling health data must notify FTC and affected individuals within 60 days\n• **FERPA (Education)** — no specific breach notification requirement, but institutions risk losing federal funding for non-compliance`,
  },
  {
    heading: "International Breach Notification Requirements",
    content: `Beyond the EU, major international frameworks include:\n\n• **UK GDPR** — mirrors EU GDPR's 72-hour requirement; ICO is the supervisory authority\n• **Canada PIPEDA** — notification required when breach creates a "real risk of significant harm"; must notify Privacy Commissioner and affected individuals "as soon as feasible"\n• **Australia NDB Scheme** — notification to OAIC and affected individuals required for "eligible data breaches" likely to result in serious harm; 30-day assessment period\n• **Brazil LGPD** — notification to ANPD and data subjects required within a "reasonable time" (ANPD recommends 2 business days)\n• **China PIPL** — immediate notification to authorities and affected individuals; specific content requirements including remedial measures\n• **India DPDP Act** — notification to Data Protection Board "without delay" upon awareness; no specific hour requirement yet\n• **Japan APPI** — notification to PPC required for breaches affecting 1,000+ individuals or involving sensitive data`,
  },
  {
    heading: "Best Practices for Breach Response",
    content: `1. **Maintain a jurisdiction-mapped breach response playbook** — pre-identify notification requirements for every jurisdiction where you hold personal data\n2. **Establish a 72-hour response capability** — even where not legally required, the GDPR standard has become the de facto global benchmark\n3. **Pre-draft notification templates** — have regulator, individual, and media templates ready to customize\n4. **Define "discovery" internally** — when does your organization "become aware" of a breach? This determination triggers notification clocks\n5. **Engage forensics and legal counsel early** — privilege considerations and forensic evidence preservation are critical\n6. **Document everything** — maintain a breach log regardless of notification obligation; regulators expect documented assessment of all incidents\n7. **Test your response plan annually** — tabletop exercises should include cross-jurisdictional scenarios`,
  },
];

export default function BreachNotificationPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/breach-notification" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Data Breach Notification Requirements by Jurisdiction",
          "description": "Comprehensive guide to global data breach notification obligations for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <PillarPage
        title="Data Breach Notification Requirements by Jurisdiction"
        subtitle="A complete reference for privacy professionals on breach notification obligations — from the GDPR's 72-hour rule to all 50 U.S. state laws, sector-specific federal requirements, and international frameworks across 20+ jurisdictions."
        icon="🚨"
        lastUpdated="March 24, 2026"
        intro="Breach notification is the most operationally consequential area of privacy law: when something goes wrong, the clock starts immediately and the requirements vary by jurisdiction, sector, and data type. This guide consolidates the obligations you need to know."
        sections={SECTIONS}
        relatedLinks={[
          { label: "📊 Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "🏥 Health Data Privacy", href: "/health-data-privacy" },
          { label: "🌍 Jurisdictions Map", href: "/jurisdictions" },
          { label: "⭐ Subscribe — $39/month", href: "/subscribe" },
        ]}
        intelligenceLabel="What changed in breach notification this week"
        updateOrFilter="title.ilike.%breach%,title.ilike.%notification%,title.ilike.%incident%,topic_tags.cs.{data-breach}"
        heroStats={[
          { value: "72h", label: "GDPR notification window" },
          { value: "50", label: "US state laws tracked" },
          { value: "€4.5B+", label: "GDPR fines to date" },
          { value: "60d", label: "HIPAA breach window" },
        ]}
        emailCaptureText="Get breach notification updates for your jurisdictions"
        midPageCtaMessage="Intelligence subscribers see all 50 US state notification requirements — timing, trigger standards, and AG thresholds — plus weekly enforcement updates."
        toolCta={{
          heading: "Your Breach Response Playbook",
          description: "A structured, jurisdiction-specific incident response guide generated for your organization. Covers GDPR, HIPAA, and all active US state laws.",
          link: "/ir-playbook",
          linkLabel: "Get your playbook →",
        }}
      />
    </>
  );
}
