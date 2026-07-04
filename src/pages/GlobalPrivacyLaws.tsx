import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";
import { JurisdictionDirectory } from "@/components/research/JurisdictionDirectory";
import { getProduct } from "@/lib/productRegistry";
import { linkGlossaryFirstMentions } from "@/lib/linkGlossaryTerms";

const GlobalPrivacyLaws = () => (
  <>
    <Helmet>
      <link rel="canonical" href="https://enduserprivacy.com/global-privacy-laws" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Global Privacy Laws Directory",
        "description": "Comparative reference to 140+ national privacy regimes, covering APAC, Latin America, Middle East, and Africa frameworks and EU GDPR adequacy status.",
        "publisher": { "@type": "Organization", "name": "End User Privacy" },
        "datePublished": "2025-01-15",
        
      })}</script>
    </Helmet>
    <ResearchPageLayout
    metaTitle="Global Privacy Laws Directory | End User Privacy"
    metaDescription="Browse 70+ privacy regimes by region, status, and EU GDPR adequacy. Comparative reference covering APAC, Latin America, Middle East, and Africa frameworks."
    header={{
      eyebrow: "Research · Global Privacy",
      title: "Global Privacy Laws",
      description:
        "Over 140 countries have enacted data protection legislation — and the majority are GDPR-modelled, meaning EU-trained compliance instincts transfer further than you might expect. Browse the directory by region, filter by statutory status, and check EU adequacy at a glance. For U.S. law see /us-privacy-laws; for EU/GDPR see /gdpr-enforcement.",
      lastUpdated: "June 10, 2026",
      feedCategory: "global",
      stats: [
        { value: "140+", label: "countries with privacy laws" },
        { value: "Most", label: "frameworks modelled on GDPR" },
        { value: "Global", label: "regulators tracked worldwide" },
        { value: "2026", label: "newest regimes active" },
      ],
    }}
    topToolCta={{
      toolName: "Registration Manager",
      toolDescription:
        "See which registrations, DPO appointments, and EU-representative filings your operations trigger across every jurisdiction on this page.",
      href: "/registration-manager",
      context: "Put this into practice:",
    }}
    sections={linkGlossaryFirstMentions([
      {
        id: "directory",
        h2: "Jurisdiction Directory",
        children: <JurisdictionDirectory />,
      },
      {
        id: "overview",
        h2: "Regional Overview",
        synthesisKey: "global__page",
        content: `<p>The directory above is the practical starting point; the sections below cover regional patterns, cross-border transfer mechanisms, and recent enforcement.</p>`,
      },
      {
        id: "apac",
        h2: "Asia-Pacific Data Protection Laws",
        synthesisKey: "global__apac",
        content: `<p>The APAC region presents the most diverse privacy regulatory landscape globally. <a href='/jurisdiction/china'>China's PIPL</a> (2021) is among the strictest — enforced by the <a href='/regulator/cac'>Cyberspace Administration of China (CAC)</a> — with data localization, cross-border transfer restrictions, and active enforcement. <a href='/jurisdiction/south-korea'>South Korea's PIPA</a>, enforced by the <a href='/regulator/pipc'>Personal Information Protection Commission (PIPC)</a>, has held EU adequacy since December 2021 and carries serious enforcement teeth: the PIPC imposed a <strong>record ₩15.1 billion penalty on Kakao in 2024 — upheld on appeal in January 2026 — and February 2026 PIPA amendments authorize fines of up to 10% of total revenue in severe breach cases</strong>. <a href='/jurisdiction/japan'>Japan's APPI</a> has mutual EU adequacy and covers cross-border transfer restrictions. <a href='/jurisdiction/india'>India's DPDP Act (2023)</a> establishes a consent-based framework; rules are still being finalized. <a href='/jurisdiction/singapore'>Singapore's PDPA</a> takes a proportionate, business-friendly approach. <a href='/jurisdiction/australia'>Australia's Privacy Act</a> is undergoing its most significant reform in decades, with the OAIC gaining stronger enforcement powers.</p><p><strong>Cross-border transfers in APAC:</strong> China requires CAC security assessments or SCCs for outbound transfers. Japan and South Korea have mutual EU adequacy. India permits transfers except to a future government blacklist.</p>`,
      },
      {
        id: "latam",
        h2: "Latin American Privacy Frameworks",
        synthesisKey: "global__latam",
        content: `<p><a href='/jurisdiction/brazil'>Brazil's LGPD</a> is the most consequential privacy law in Latin America — GDPR-equivalent in structure, with the <a href='/regulator/anpd'>National Data Protection Authority (ANPD)</a> now fully operational and issuing guidance and fines. In August 2024, the ANPD adopted its Standard Contractual Clauses (Resolution CD/ANPD 19/2024), bringing Brazil into alignment with EU practice. <a href='/jurisdiction/argentina'>Argentina's Ley 25.326</a> predates GDPR but maintains EU adequacy — a significant practical advantage for multinationals. <a href='/jurisdiction/mexico'>Mexico enacted a new LFPDPPP in March 2025; the longtime regulator INAI was dissolved in the 2024–25 constitutional reform, with enforcement transferred to the federal executive</a>. <a href='/jurisdiction/colombia'>Colombia</a> (SIC), <a href='/jurisdiction/chile'>Chile</a>, and <a href='/jurisdiction/peru'>Peru</a> have enacted or modernized data protection frameworks in recent years.</p><p><strong>Practical note:</strong> Brazil and Argentina both have DPA registration or notification requirements for certain processing activities.</p>`,
      },
      {
        id: "mea",
        h2: "Middle East and Africa",
        synthesisKey: "global__mea",
        content: `<p>The Middle East and Africa are the fastest-growing regions for privacy regulation. The UAE has multiple frameworks including the <a href="https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws" target="_blank" rel="noopener noreferrer">federal PDPL</a> and <a href="https://www.difc.ae/business/laws-regulations/legal-database/data-protection-law-difc-law-no-5-2020" target="_blank" rel="noopener noreferrer">DIFC</a>/<a href="https://en.adgm.thomsonreuters.com/rulebook/data-protection-regulations-2021" target="_blank" rel="noopener noreferrer">ADGM</a> regulations. <a href="/jurisdiction/saudi-arabia">Saudi Arabia</a>'s <a href="https://sdaia.gov.sa/en/SDAIA/about/Files/PersonalDataEnglish.pdf" target="_blank" rel="noopener noreferrer">PDPL</a>, enforced by <a href="/regulator/sdaia">Saudi Data and AI Authority (SDAIA)</a>, applies broadly. <a href="/jurisdiction/south-africa">South Africa</a>'s <a href="https://www.gov.za/documents/protection-personal-information-act" target="_blank" rel="noopener noreferrer">POPIA</a>, enforced by the <a href="/regulator/information-regulator">Information Regulator</a>, is in full effect. <a href="/jurisdiction/nigeria">Nigeria</a> (<a href="/regulator/ndpc">Nigeria Data Protection Commission (NDPC)</a>), <a href="/jurisdiction/kenya">Kenya</a>, <a href="/jurisdiction/egypt">Egypt</a>, and <a href="/jurisdiction/ghana">Ghana</a> have enacted laws with varying enforcement capacity.</p><p><strong>Practitioner note:</strong> The UAE has three overlapping regimes (federal PDPL, DIFC, ADGM) — the applicable law depends on whether the entity operates onshore, in the DIFC financial free zone, or in ADGM. Verify jurisdiction before assuming compliance with one satisfies the others.</p>`,
      },
      {
        id: "cross-border",
        h2: "Cross-Border Transfer Implications",
        synthesisKey: "global__crossborder",
        content: `<p>Most global frameworks restrict the transfer of personal data to countries without adequate protections. The practical implications vary significantly by regime:</p><ul><li><strong>China PIPL:</strong> Outbound transfers require a CAC security assessment, standard contracts, or certification — strict and actively enforced.</li><li><strong>Brazil LGPD:</strong> Transfers permitted to adequate countries or via SCCs; the ANPD adopted SCCs in August 2024.</li><li><strong>India DPDP Act:</strong> Transfers permitted except to a future government blacklist (not yet published).</li><li><strong>South Korea PIPA:</strong> EU adequacy since December 2021; transfers to other destinations require consent or SCCs.</li><li><strong>Saudi Arabia PDPL:</strong> Transfer rules being finalized by SDAIA — current guidance requires equivalent protection.</li><li><strong>South Africa POPIA:</strong> Transfers require recipient to have comparable protection or data subject consent.</li></ul><p>For detailed mechanism-by-mechanism guidance, see the <a href='/cross-border-transfers'>Cross-Border Transfers Guide</a>.</p>`,
      },
      {
        id: "enforcement",
        h2: "Global Privacy Enforcement — Key Cases",
        synthesisKey: "global__enforcement",
        content: `<p>Enforcement outside the U.S. and EU is accelerating. Key cases by region:</p><ul><li><strong>Asia-Pacific:</strong> Korea PIPC — ₩15.1B Kakao penalty (2024; upheld on appeal 2026); China CAC enforcement of PIPL cross-border requirements against multiple multinationals.</li><li><strong>Latin America:</strong> Brazil ANPD — escalating guidance and first significant fines; Argentina AAIP enforcement of Ley 25.326.</li><li><strong>Middle East & Africa:</strong> South Africa Information Regulator — expanding POPIA enforcement actions; UAE DIFC Commissioner active enforcement.</li></ul><p>Cross-cutting trends: AI-specific provisions are being integrated into privacy frameworks globally; children's privacy is receiving heightened attention across all regions; cross-border DPA cooperation is increasing; and data localization requirements are expanding, particularly in Asia and the Middle East.</p>`,
        toolCta: {
          toolName: "Governance Assessment",
          toolDescription:
            "Assess your privacy program against enforcement patterns from regulators across the world.",
          href: "/governance-assessment",
        },
      },
    ])}
    relatedLinks={[
      { label: "Cross-Border Transfers Guide", href: "/cross-border-transfers" },
      { label: "Global Privacy Authority Directory", href: "/global-privacy-authorities" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
      { label: "Registration Manager", href: "/registration-manager" },
    ]}
    intelligenceUpsellTopic="global privacy law developments"
  />
  </>
);

export default GlobalPrivacyLaws;
