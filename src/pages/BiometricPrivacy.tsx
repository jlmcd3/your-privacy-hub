import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";

export default function BiometricPrivacyPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://enduserprivacy.com/biometric-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Biometric Privacy Laws: BIPA, State Laws & GDPR",
          "description": "Comprehensive guide to biometric privacy laws for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="Biometric Privacy Laws: BIPA, State Laws & GDPR | End User Privacy"
        metaDescription="Reference for privacy professionals on biometric data regulation — Illinois BIPA, Texas CUBI, Washington, GDPR Article 9, EU AI Act, and workplace compliance."
        header={{
          eyebrow: "Research · Biometric Privacy",
          title: "Biometric Privacy Laws: BIPA, State Laws & GDPR",
          description:
            "Biometric data is regulated more strictly than almost any other category — and exposure compounds quickly under BIPA's per-scan damages model. This reference covers every active framework you need to know.",
          lastUpdated: "March 24, 2026",
          feedCategory: "biometric",
          stats: [
            { value: "$1K–$5K", label: "BIPA per-violation damages" },
            { value: "$650M", label: "Meta BIPA settlement" },
            { value: "$1.4B", label: "Texas–Meta settlement" },
            { value: "6+", label: "state biometric laws" },
          ],
        }}
        pageSynthesisKey="biometric__page"
        sections={[
          {
            id: "bipa",
            h2: "Illinois BIPA — The Strictest Biometric Privacy Law",
            synthesisKey: "biometric__bipa",
            content: `<p>The Illinois Biometric Information Privacy Act (<a href="https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57" target="_blank" rel="noopener noreferrer">740 ILCS 14</a>) remains the most consequential biometric privacy law in the world. Enacted in 2008, BIPA requires written informed consent before collecting biometric identifiers, a publicly available retention and destruction policy, no sale or trade of biometric data, and reasonable security measures.</p>
<p>BIPA's <strong>private right of action</strong> is its most powerful feature — individuals can sue for $1,000 per negligent violation and $5,000 per intentional or reckless violation. In 2023, the Illinois Supreme Court ruled in <a href="https://courts.illinois.gov/Opinions/SupremeCourt/2023/127891.pdf" target="_blank" rel="noopener noreferrer">Cothron v. White Castle</a> that damages accrue with each scan or transmission, exponentially increasing exposure.</p>
<ul><li>Facebook/Meta — $650M (2021)</li><li>Google — $100M (2022)</li><li>BNSF Railway — $228M jury verdict (2022)</li></ul>`,
          },
          {
            id: "state-laws",
            h2: "State Biometric Privacy Laws — Texas, Washington and Beyond",
            synthesisKey: "biometric__state_laws",
            content: `<p><strong>Texas CUBI</strong> (<a href="https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm" target="_blank" rel="noopener noreferrer">Tex. Bus. &amp; Com. Code § 503.001</a>) prohibits capturing biometric identifiers for commercial purposes without informed consent. In 2024, AG Ken Paxton secured a <strong>$1.4B settlement from Meta</strong> for unauthorized facial recognition data collection.</p>
<p><strong>Washington Biometric Privacy</strong> (<a href="https://app.leg.wa.gov/rcw/default.aspx?cite=19.375" target="_blank" rel="noopener noreferrer">RCW 19.375</a>) prohibits enrolling biometric identifiers in a commercial database without consent, enforced by the AG.</p>
<p>Nearly every comprehensive state privacy law (California CPRA, Colorado, Connecticut, Virginia, Oregon, Montana, Texas) classifies biometric data as <strong>sensitive personal information</strong> requiring opt-in consent.</p>`,
            toolCta: {
              toolName: "Biometric Compliance Checker",
              toolDescription:
                "Covers BIPA, Texas, Washington, and GDPR biometric requirements in a single structured assessment.",
              href: "/biometric-checker",
            },
          },
          {
            id: "gdpr-eu",
            h2: "GDPR Article 9 and EU AI Act — Biometric Data in Europe",
            synthesisKey: "biometric__gdpr_eu",
            content: `<p>Under <a href="https://gdpr-info.eu/art-9-gdpr/" target="_blank" rel="noopener noreferrer">GDPR Article 9</a>, biometric data processed for the purpose of uniquely identifying an individual is a special category requiring explicit consent or another Article 9 lawful basis. The <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" target="_blank" rel="noopener noreferrer">EU AI Act</a> further restricts biometric identification systems in public spaces, with narrow law-enforcement exceptions. Clearview AI has been fined €20M+ by multiple DPAs (France, Italy, UK, Greece) for scraping facial images.</p>`,
          },
          {
            id: "workplace",
            h2: "Workplace Biometric Use",
            synthesisKey: "biometric__workplace",
            content: `<p>Biometric timekeeping, access control, and identity verification in the workplace are among the highest-risk use cases. BIPA litigation is dominated by workplace claims — fingerprint time clocks, facial recognition entry systems, and palm scanners. <a href="https://www.eeoc.gov/artificial-intelligence-and-algorithmic-fairness" target="_blank" rel="noopener noreferrer">EEOC guidance</a> warns that biometric screening tools may create disparate impact liability. The <a href="https://www.nlrb.gov/" target="_blank" rel="noopener noreferrer">NLRB</a> has indicated that implementation of biometric monitoring may be a mandatory subject of bargaining.</p>`,
          },
          {
            id: "enforcement",
            h2: "Biometric Enforcement — Settlements and Verdicts",
            synthesisKey: "biometric__enforcement",
            content: `<p>Biometric privacy enforcement is accelerating. BIPA class actions remain the dominant litigation vector. State AG enforcement is expanding — Texas' $1.4B Meta settlement signals a new era of AG-driven biometric enforcement. The <a href="https://www.ftc.gov/" target="_blank" rel="noopener noreferrer">FTC</a> has brought enforcement actions against <a href="https://www.ftc.gov/legal-library/browse/cases-proceedings/232-3060-rite-aid-corporation" target="_blank" rel="noopener noreferrer">Rite Aid</a> (facial recognition) and Amazon (Alexa voice data), signaling federal interest.</p>`,
          },
        ]}
        relatedLinks={[
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "U.S. State Privacy Laws", href: "/us-state-privacy-laws" },
          { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="biometric privacy"
      />
    </>
  );
}
