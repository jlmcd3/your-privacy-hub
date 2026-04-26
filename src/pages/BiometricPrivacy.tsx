import { Helmet } from "react-helmet-async";
import PillarPage from "@/components/PillarPage";

const SECTIONS = [
  {
    heading: "What Is Biometric Data?",
    content: `Biometric data refers to physiological or behavioral characteristics used to identify individuals — including fingerprints, facial geometry, iris scans, voiceprints, gait analysis, and keystroke dynamics. As biometric technologies become embedded in consumer devices, workplace systems, and public surveillance, a patchwork of laws has emerged to regulate their collection, use, and storage.\n\nThe regulatory landscape is defined by two forces: **state-level biometric privacy statutes** (led by Illinois' BIPA) and **broader privacy laws** that include biometric data within their definitions of sensitive personal information.`,
  },
  {
    heading: "Illinois BIPA: The Gold Standard",
    content: `The Illinois Biometric Information Privacy Act (740 ILCS 14) remains the most consequential biometric privacy law in the world. Enacted in 2008, BIPA requires:\n\n• **Written informed consent** before collecting biometric identifiers or information\n• **A publicly available retention and destruction policy** specifying when biometric data will be permanently deleted\n• **No sale, lease, or trade** of biometric data\n• **Reasonable security measures** to protect stored biometric data\n\nBIPA's **private right of action** is its most powerful feature — individuals can sue for $1,000 per negligent violation and $5,000 per intentional or reckless violation. In 2023, the Illinois Supreme Court ruled in **Cothron v. White Castle** that damages accrue with each scan or transmission, not just the first, exponentially increasing exposure.\n\nMajor settlements include:\n• **Facebook/Meta** — $650M (2021)\n• **Google** — $100M (2022)\n• **BNSF Railway** — $228M jury verdict (2022)\n• **White Castle** — estimated $17B+ exposure (pending resolution)`,
  },
  {
    heading: "Texas & Washington Biometric Laws",
    content: `**Texas CUBI (Tex. Bus. & Com. Code § 503.001):** Enacted in 2009, Texas prohibits capturing biometric identifiers for commercial purposes without informed consent. Unlike BIPA, enforcement was limited to the Attorney General — until 2024, when AG Ken Paxton secured a **$1.4B settlement from Meta** for unauthorized facial recognition data collection through Facebook's tag suggestions feature.\n\n**Washington Biometric Privacy (RCW 19.375):** Washington's 2017 law prohibits enrolling biometric identifiers in a database for a commercial purpose without consent. It does not include a private right of action, relying on AG enforcement and the state Consumer Protection Act.`,
  },
  {
    heading: "Comprehensive Privacy Laws & Biometric Data",
    content: `Nearly every comprehensive state privacy law classifies biometric data as **sensitive personal information** requiring heightened protections:\n\n• **California (CPRA):** Biometric data is a category of sensitive PI requiring opt-in consent for processing beyond what's necessary for the service\n• **Colorado, Connecticut, Virginia, Oregon, Montana, Texas:** All require opt-in consent before processing biometric data\n• **EU GDPR (Article 9):** Biometric data processed for identification is a "special category" requiring explicit consent or another Article 9 lawful basis\n• **EU AI Act:** Biometric identification systems in public spaces are largely prohibited, with narrow law enforcement exceptions\n\nThe practical effect: any organization using biometric authentication, facial recognition, or voice identification must navigate a complex, jurisdiction-specific consent and governance framework.`,
  },
  {
    heading: "Workplace Biometric Use",
    content: `Biometric timekeeping, access control, and identity verification in the workplace are among the highest-risk use cases:\n\n• **BIPA litigation** is dominated by workplace claims — fingerprint time clocks, facial recognition entry systems, and palm scanners\n• **EEOC guidance** warns that biometric screening tools may create disparate impact liability under Title VII\n• **ADA considerations** arise when biometric systems fail to accommodate individuals with disabilities\n• **Union considerations** — NLRB has indicated that implementation of biometric monitoring may be a mandatory subject of bargaining`,
  },
  {
    heading: "Enforcement & Litigation Trends",
    content: `Biometric privacy enforcement is accelerating:\n\n• **BIPA class actions** remain the dominant litigation vector, with hundreds of active cases in Illinois state and federal courts\n• **State AG enforcement** is expanding — Texas' $1.4B Meta settlement signals a new era of AG-driven biometric enforcement\n• **FTC actions** — the FTC has brought enforcement actions against Rite Aid (facial recognition) and Amazon (Alexa voice data), signaling federal interest\n• **EU enforcement** — Clearview AI fined €20M+ by multiple DPAs (France, Italy, UK, Greece) for scraping facial images\n\nOrganizations should expect: more states adopting biometric-specific laws, increased private litigation, and growing regulatory scrutiny of AI-powered biometric systems.`,
  },
];

export default function BiometricPrivacyPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://privacy-guardian-v3.lovable.app/biometric-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Biometric Privacy Laws: BIPA, State Laws & GDPR",
          "description": "Comprehensive guide to biometric privacy laws for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "Your Privacy Hub" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <PillarPage
        title="Biometric Privacy Laws: BIPA, State Laws & GDPR"
        subtitle="Everything privacy professionals need to know about biometric data regulation — from Illinois BIPA's landmark private right of action to GDPR Article 9, workplace compliance, and the latest enforcement trends."
        icon="👁️"
        lastUpdated="March 24, 2026"
        intro="Biometric data is regulated more strictly than almost any other category — and exposure compounds quickly under BIPA's per-scan damages model. This guide covers every active framework you need to know."
        sections={SECTIONS}
        relatedLinks={[
          { label: "📊 Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "🇺🇸 U.S. State Privacy Laws", href: "/us-state-privacy-laws" },
          { label: "🤖 AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { label: "⭐ Subscribe — $39/month", href: "/subscribe" },
        ]}
        intelligenceLabel="What changed in biometric privacy this week"
        updateOrFilter="title.ilike.%biometric%,title.ilike.%facial recognition%,title.ilike.%BIPA%,topic_tags.cs.{biometric}"
        heroStats={[
          { value: "$1K–$5K", label: "BIPA per-violation damages" },
          { value: "$650M", label: "Meta BIPA settlement" },
          { value: "$1.4B", label: "Texas–Meta settlement" },
          { value: "6+", label: "state biometric laws" },
        ]}
        emailCaptureText="Get biometric compliance alerts as laws change"
        midPageCtaMessage="Intelligence subscribers see the full state-by-state biometric law comparison — BIPA, Texas CUBI, Washington MY Health MY Data, and all emerging state laws."
        toolCta={{
          heading: "Biometric Compliance Checker",
          description: "Covers BIPA, Texas, Washington, and GDPR biometric requirements in a single structured assessment. Included with Intelligence — no extra cost.",
          link: "/biometric-checker",
          linkLabel: "Run the checker →",
        }}
      />
    </>
  );
}
