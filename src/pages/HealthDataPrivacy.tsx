import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";

export default function HealthDataPrivacyPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://enduserprivacy.com/health-data-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws",
          "description": "Comprehensive health data privacy guide for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="Health Data Privacy: HIPAA, FTC Health Breach Rule, State Laws | End User Privacy"
        metaDescription="Reference on health data privacy obligations across HIPAA, the FTC Health Breach Notification Rule, state consumer health data laws, and AI in healthcare."
        header={{
          eyebrow: "Research · Health Data",
          title: "Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws",
          description:
            "Health data sits at the intersection of HIPAA, FTC enforcement, fast-moving state consumer health laws, and AI regulation. Compliance teams need a single, current map of obligations across all four.",
          lastUpdated: "March 24, 2026",
          feedCategory: "health-data",
          stats: [
            { value: "60d", label: "HIPAA breach window" },
            { value: "$1.5M", label: "GoodRx FTC penalty" },
            { value: "$7.8M", label: "BetterHelp settlement" },
            { value: "5+", label: "state consumer health laws" },
          ],
        }}
        pageSynthesisKey="health__page"
        topToolCta={{
          toolName: "Privacy Program Assessment",
          toolDescription:
            "Structured assessment covering HIPAA, the FTC Health Breach Rule, and state health data laws — formatted for leadership or counsel review.",
          href: "/governance-assessment",
        }}
        sections={[
          {
            id: "hipaa",
            h2: "HIPAA — The Federal Foundation for Health Privacy",
            synthesisKey: "health__hipaa",
            content: `<p><a href="https://www.hhs.gov/hipaa/index.html" target="_blank" rel="noopener noreferrer">HIPAA</a>'s <a href="https://www.hhs.gov/hipaa/for-professionals/privacy/index.html" target="_blank" rel="noopener noreferrer">Privacy Rule</a> and <a href="https://www.hhs.gov/hipaa/for-professionals/security/index.html" target="_blank" rel="noopener noreferrer">Security Rule</a> govern PHI use and disclosure by covered entities and business associates. Key obligations: the <strong>Minimum Necessary Standard</strong>, mandatory <a href="https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html" target="_blank" rel="noopener noreferrer">Business Associate Agreements</a>, the <a href="https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html" target="_blank" rel="noopener noreferrer">Breach Notification Rule</a> (60-day window), and patient Right of Access (30 days). HHS OCR enforces through audits and civil monetary penalties ranging from $100 to $50,000 per violation, up to $2M annually per category.</p>`,
          },
          {
            id: "ftc-hbr",
            h2: "FTC Health Breach Notification Rule",
            synthesisKey: "health__ftc_hbr",
            content: `<p>The <a href="https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule" target="_blank" rel="noopener noreferrer">FTC Health Breach Notification Rule</a> covers health data held by entities NOT subject to HIPAA — health apps, fitness trackers, and direct-to-consumer health platforms. Recent enforcement: <strong>GoodRx</strong> ($1.5M for sharing health data with ad platforms), <strong>BetterHelp</strong> ($7.8M for sharing therapy data with Facebook and Snapchat), and <strong>Premom</strong> (consent order for sharing fertility data). "Breach" is defined broadly to include unauthorized sharing, not just security incidents.</p>`,
          },
          {
            id: "state-laws",
            h2: "State Consumer Health Data Laws",
            synthesisKey: "health__state_laws",
            content: `<p><strong><a href="https://app.leg.wa.gov/rcw/default.aspx?cite=70.372" target="_blank" rel="noopener noreferrer">Washington My Health My Data Act (MHMDA)</a></strong> is the most comprehensive state health data law: it applies broadly (not just to covered entities), requires clear consent, grants a private right of action, and covers reproductive, mental health, gender-affirming care, and biometric data. <strong><a href="https://www.leg.state.nv.us/App/NELIS/REL/82nd2023/Bill/SB370/Overview" target="_blank" rel="noopener noreferrer">Nevada SB 370</a></strong> provides similar protections. <strong>Connecticut, Oregon, and Montana</strong> include health data provisions in their comprehensive privacy laws. Following <a href="https://www.supremecourt.gov/opinions/21pdf/19-1392_6j37.pdf" target="_blank" rel="noopener noreferrer">Dobbs</a>, multiple states (CA, IL, MD, WA) enacted reproductive and sexual health data protections.</p>`,
          },
          {
            id: "ai",
            h2: "AI and Health Data — Emerging Obligations",
            synthesisKey: "health__ai",
            content: `<p>The <strong>HHS AI Strategy</strong> currently provides voluntary frameworks; expect mandatory requirements by 2027. The <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" target="_blank" rel="noopener noreferrer">EU AI Act</a> classifies AI systems used in healthcare as "high-risk." <a href="https://leg.colorado.gov/bills/sb24-205" target="_blank" rel="noopener noreferrer">Colorado's AI Act</a> (effective 2026) requires impact assessments for AI systems making consequential healthcare decisions. De-identification challenges loom: AI training on health data raises questions about re-identification risk and HIPAA exposure.</p>`,
          },
          {
            id: "enforcement",
            h2: "Health Data Breach Enforcement — Key Cases",
            synthesisKey: "health__enforcement",
            content: `<p>HHS OCR continues to issue large HIPAA settlements, with multi-million dollar penalties for inadequate risk analysis, missing BAAs, and failure to encrypt mobile devices. FTC Health Breach Rule actions (GoodRx, BetterHelp, Premom) show the agency's willingness to treat ad-tech sharing as a "breach." State AGs are increasingly pursuing actions under Washington MHMDA and other state consumer health laws.</p>`,
          },
        ]}
        relatedLinks={[
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "Breach Notification", href: "/breach-notification" },
          { label: "Compliance Calendar", href: "/calendar" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="health data privacy"
      />
    </>
  );
}
