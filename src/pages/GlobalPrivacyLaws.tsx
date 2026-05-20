import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";

const GlobalPrivacyLaws = () => (
  <ResearchPageLayout
    metaTitle="Global Privacy Laws — APAC, LATAM, MEA Frameworks | End User Privacy"
    metaDescription="Comparative reference for privacy regulation outside the U.S. and EU: APAC, Latin America, Middle East, and Africa frameworks, with cross-border transfer mechanisms and enforcement."
    header={{
      eyebrow: "Research · Global Privacy",
      title: "Global Privacy Laws",
      description:
        "Over 140 countries have enacted data protection legislation — and the majority are GDPR-modelled, meaning EU-trained compliance instincts transfer further than you might expect. This reference covers the major frameworks outside the U.S. and EU: Asia-Pacific, Latin America, the Middle East, and Africa. For U.S. law see /us-privacy-laws; for EU/GDPR see /gdpr-enforcement.",
      lastUpdated: "March 7, 2026",
      feedCategory: "global",
      stats: [
        { value: "140+", label: "countries with privacy laws" },
        { value: "80%+", label: "modelled on GDPR" },
        { value: "119", label: "regulators tracked" },
        { value: "2026", label: "newest regimes active" },
      ],
    }}
    pageSynthesisKey="global__page"
    topToolCta={{
      toolName: "Data Processing Agreement Generator",
      toolDescription:
        "Generate a jurisdiction-specific DPA covering LGPD, PIPL, APPI, PDPA and other frameworks tracked on this page.",
      href: "/dpa-generator",
    }}
    sections={[
      {
        id: "apac",
        h2: "Asia-Pacific Data Protection Laws",
        synthesisKey: "global__apac",
        content: `<p>The APAC region presents the most diverse privacy regulatory landscape globally. <a href='/jurisdiction/china'>China's PIPL</a> (2021) is among the strictest — enforced by the <a href='/regulator/cac'>CAC</a> — with data localization, cross-border transfer restrictions, and active enforcement. <a href='/jurisdiction/south-korea'>South Korea's PIPA</a>, enforced by the <a href='/regulator/pipc'>PIPC</a>, achieved EU adequacy in 2024 and carries serious enforcement teeth: the PIPC imposed a <strong>₩5.6 billion penalty on Kakao Corp in 2026</strong>. <a href='/jurisdiction/japan'>Japan's APPI</a> has mutual EU adequacy and covers cross-border transfer restrictions. <a href='/jurisdiction/india'>India's DPDP Act (2023)</a> establishes a consent-based framework; rules are still being finalized. <a href='/jurisdiction/singapore'>Singapore's PDPA</a> takes a proportionate, business-friendly approach. <a href='/jurisdiction/australia'>Australia's Privacy Act</a> is undergoing its most significant reform in decades, with the OAIC gaining stronger enforcement powers.</p><p><strong>Cross-border transfers in APAC:</strong> China requires CAC security assessments or SCCs for outbound transfers. Japan and South Korea have mutual EU adequacy. India permits transfers except to a future government blacklist.</p>`,
      },
      {
        id: "latam",
        h2: "Latin American Privacy Frameworks",
        synthesisKey: "global__latam",
        content: `<p><a href='/jurisdiction/brazil'>Brazil's LGPD</a> is the most consequential privacy law in Latin America — GDPR-equivalent in structure, with the <a href='/regulator/anpd'>ANPD</a> now fully operational and issuing guidance and fines. In March 2026, the ANPD issued Standard Contractual Clause guidance for cross-border transfers, bringing Brazil into alignment with EU practice. <a href='/jurisdiction/argentina'>Argentina's Ley 25.326</a> predates GDPR but maintains EU adequacy — a significant practical advantage for multinationals. <a href='/jurisdiction/mexico'>Mexico's LFPDPPP</a>, enforced by <a href='/regulator/inai'>INAI</a>, takes a consent-based approach. <a href='/jurisdiction/colombia'>Colombia</a> (SIC), <a href='/jurisdiction/chile'>Chile</a>, and <a href='/jurisdiction/peru'>Peru</a> have enacted or modernized data protection frameworks in recent years.</p><p><strong>Practical note:</strong> Brazil and Argentina both have DPA registration or notification requirements for certain processing activities.</p>`,
      },
      {
        id: "mea",
        h2: "Middle East and Africa",
        synthesisKey: "global__mea",
        content: `<p>The Middle East and Africa are the fastest-growing regions for privacy regulation. The UAE has multiple frameworks including the <a href="https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws" target="_blank" rel="noopener noreferrer">federal PDPL</a> and <a href="https://www.difc.ae/business/laws-regulations/legal-database/data-protection-law-difc-law-no-5-2020" target="_blank" rel="noopener noreferrer">DIFC</a>/<a href="https://en.adgm.thomsonreuters.com/rulebook/data-protection-regulations-2021" target="_blank" rel="noopener noreferrer">ADGM</a> regulations. <a href="/jurisdiction/saudi-arabia">Saudi Arabia</a>'s <a href="https://sdaia.gov.sa/en/SDAIA/about/Files/PersonalDataEnglish.pdf" target="_blank" rel="noopener noreferrer">PDPL</a>, enforced by <a href="/regulator/sdaia">SDAIA</a>, applies broadly. <a href="/jurisdiction/south-africa">South Africa</a>'s <a href="https://www.gov.za/documents/protection-personal-information-act" target="_blank" rel="noopener noreferrer">POPIA</a>, enforced by the <a href="/regulator/information-regulator">Information Regulator</a>, is in full effect. <a href="/jurisdiction/nigeria">Nigeria</a> (<a href="/regulator/ndpc">NDPC</a>), <a href="/jurisdiction/kenya">Kenya</a>, <a href="/jurisdiction/egypt">Egypt</a>, and <a href="/jurisdiction/ghana">Ghana</a> have enacted laws with varying enforcement capacity.</p><p><strong>Practitioner note:</strong> The UAE has three overlapping regimes (federal PDPL, DIFC, ADGM) — the applicable law depends on whether the entity operates onshore, in the DIFC financial free zone, or in ADGM. Verify jurisdiction before assuming compliance with one satisfies the others.</p>`,
      },
      {
        id: "cross-border",
        h2: "Cross-Border Transfer Implications",
        synthesisKey: "global__crossborder",
        content: `<p>Most global frameworks restrict the transfer of personal data to countries without adequate protections. The practical implications vary significantly by regime:</p><ul><li><strong>China PIPL:</strong> Outbound transfers require a CAC security assessment, standard contracts, or certification — strict and actively enforced.</li><li><strong>Brazil LGPD:</strong> Transfers permitted to adequate countries or via SCCs; ANPD published SCC guidance in 2026.</li><li><strong>India DPDP Act:</strong> Transfers permitted except to a future government blacklist (not yet published).</li><li><strong>South Korea PIPA:</strong> EU adequacy since 2024; transfers to other destinations require consent or SCCs.</li><li><strong>Saudi Arabia PDPL:</strong> Transfer rules being finalized by SDAIA — current guidance requires equivalent protection.</li><li><strong>South Africa POPIA:</strong> Transfers require recipient to have comparable protection or data subject consent.</li></ul><p>For detailed mechanism-by-mechanism guidance, see the <a href='/cross-border-transfers'>Cross-Border Transfers Guide</a>.</p>`,
      },
      {
        id: "enforcement",
        h2: "Global Privacy Enforcement — Key Cases",
        synthesisKey: "global__enforcement",
        content: `<p>Enforcement outside the U.S. and EU is accelerating. Key cases by region:</p><ul><li><strong>Asia-Pacific:</strong> Korea PIPC — ₩5.6B Kakao penalty (2026); China CAC enforcement of PIPL cross-border requirements against multiple multinationals.</li><li><strong>Latin America:</strong> Brazil ANPD — escalating guidance and first significant fines; Argentina AAIP enforcement of Ley 25.326.</li><li><strong>Middle East & Africa:</strong> South Africa Information Regulator — expanding POPIA enforcement actions; UAE DIFC Commissioner active enforcement.</li></ul><p>Cross-cutting trends: AI-specific provisions are being integrated into privacy frameworks globally; children's privacy is receiving heightened attention across all regions; cross-border DPA cooperation is increasing; and data localization requirements are expanding, particularly in Asia and the Middle East.</p>`,
        toolCta: {
          toolName: "Governance Assessment",
          toolDescription:
            "Assess your privacy program against enforcement patterns from 119 regulators worldwide.",
          href: "/governance-assessment",
        },
      },
    ]}
    relatedLinks={[
      { label: "Cross-Border Transfers Guide", href: "/cross-border-transfers" },
      { label: "Global Privacy Authority Directory", href: "/global-privacy-authorities" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
      { label: "Registration Manager", href: "/registration-manager" },
    ]}
    intelligenceUpsellTopic="global privacy law developments"
  />
);

export default GlobalPrivacyLaws;
