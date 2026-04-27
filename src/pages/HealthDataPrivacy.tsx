import { Helmet } from "react-helmet-async";
import PillarPage from "@/components/PillarPage";

const SECTIONS = [
  {
    heading: "HIPAA: The Federal Foundation",
    content: `The Health Insurance Portability and Accountability Act (HIPAA) remains the cornerstone of U.S. health data privacy. Its Privacy Rule (45 CFR Part 160 and Subparts A, E of Part 164) and Security Rule govern the use and disclosure of Protected Health Information (PHI) by covered entities (health plans, healthcare providers, healthcare clearinghouses) and their business associates.\n\nKey obligations include:\n• **Minimum Necessary Standard** — access only the PHI reasonably necessary for the intended purpose\n• **Business Associate Agreements (BAAs)** — required for any vendor that creates, receives, maintains, or transmits PHI\n• **Breach Notification Rule** — notify HHS, affected individuals, and potentially media within 60 days of discovering a breach of unsecured PHI\n• **Right of Access** — patients can request copies of their PHI within 30 days\n\nHHS OCR enforces HIPAA through audits, complaint investigations, and civil monetary penalties ranging from $100 to $50,000 per violation (up to $2M annually per violation category).`,
  },
  {
    heading: "FTC Health Breach Notification Rule",
    content: `The FTC's Health Breach Notification Rule (16 CFR Part 318) fills a critical gap: it covers health data held by entities NOT subject to HIPAA — including health apps, fitness trackers, and direct-to-consumer health platforms.\n\nIn 2023-2025, the FTC significantly expanded enforcement of this rule:\n• **GoodRx** — $1.5M penalty for sharing health data with advertising platforms without consumer consent\n• **BetterHelp** — $7.8M settlement for sharing therapy session data with Facebook and Snapchat for advertising\n• **Premom** — consent order for sharing fertility data with third-party analytics\n\nThe rule requires notification to the FTC, affected individuals, and prominent media within 60 days of a breach of health data. "Breach" is defined broadly to include unauthorized sharing, not just security incidents.`,
  },
  {
    heading: "State Consumer Health Data Laws",
    content: `A new wave of state laws now extends health data protections beyond HIPAA:\n\n**Washington My Health My Data Act (MHMDA)** — Effective March 2024, this is the most comprehensive state health data law. It:\n• Applies to any entity that collects, processes, or shares consumer health data (not limited to covered entities)\n• Requires clear consent before collection or sharing\n• Grants a private right of action (unlike most state privacy laws)\n• Covers reproductive health, mental health, gender-affirming care data, and biometric data\n\n**Nevada SB 370** — Similar consumer health data protections effective 2024.\n\n**Connecticut, Oregon, Montana** — Each includes health data provisions in their comprehensive privacy laws, with varying definitions and consent requirements.\n\n**Reproductive Health Data** — Following the Dobbs decision, multiple states (CA, IL, MD, WA) enacted specific protections for reproductive and sexual health data, restricting law enforcement access and requiring heightened consent for collection.`,
  },
  {
    heading: "AI & Health Data: Emerging Obligations",
    content: `The intersection of AI and health data is creating new compliance challenges:\n\n• **HHS AI Strategy** — Voluntary AI frameworks for healthcare, but expect mandatory requirements by 2027\n• **EU AI Act** — Classifies AI systems used in healthcare as "high-risk," requiring conformity assessments, human oversight, and data governance\n• **State AI Health Laws** — Colorado's AI Act (effective 2026) requires impact assessments for AI systems that make consequential decisions in healthcare\n• **De-identification challenges** — AI training on health data raises questions about whether de-identified data can be re-identified, potentially creating HIPAA compliance risk`,
  },
];

export default function HealthDataPrivacyPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/health-data-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws",
          "description": "Comprehensive health data privacy guide for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <PillarPage
        title="Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws"
        subtitle="A comprehensive guide to health data privacy obligations covering HIPAA, the FTC Health Breach Notification Rule, state consumer health data laws, and the emerging intersection of AI and healthcare regulation."
        icon="🏥"
        lastUpdated="March 24, 2026"
        intro="Health data sits at the intersection of HIPAA, FTC enforcement, fast-moving state consumer health laws, and AI regulation. Compliance teams need a single, current map of obligations across all four."
        sections={SECTIONS}
        relatedLinks={[
          { label: "📊 Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "🔓 Breach Notification", href: "/breach-notification" },
          { label: "📅 Compliance Calendar", href: "/calendar" },
          { label: "⭐ Subscribe — $39/month", href: "/subscribe" },
        ]}
        intelligenceLabel="What changed in health data privacy this week"
        updateOrFilter="title.ilike.%HIPAA%,title.ilike.%health data%,title.ilike.%health breach%,topic_tags.cs.{health-data}"
        heroStats={[
          { value: "60d", label: "HIPAA breach notification window" },
          { value: "$1.5M", label: "GoodRx FTC penalty" },
          { value: "$7.8M", label: "BetterHelp settlement" },
          { value: "5+", label: "state consumer health laws" },
        ]}
        emailCaptureText="Get HIPAA and state health law enforcement alerts"
        midPageCtaMessage="Intelligence subscribers see full state consumer health law comparisons — Washington, Nevada, Connecticut, Oregon, Montana, and all emerging laws."
        toolCta={{
          heading: "Privacy Program Assessment Tool",
          description: "A structured assessment that walks through HIPAA, FTC Health Breach Rule, and state health data laws — formatted to present to leadership or counsel.",
          link: "/governance-assessment",
          linkLabel: "Run your assessment →",
        }}
      />
    </>
  );
}
