import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";

const GlobalPrivacyLaws = () => (
  <ResearchPageLayout
    metaTitle="Global Privacy Laws — APAC, LATAM, MEA Frameworks | End User Privacy"
    metaDescription="Comparative reference for privacy regulation outside the U.S. and EU: APAC, Latin America, Middle East, and Africa frameworks, with cross-border transfer mechanisms and enforcement."
    header={{
      eyebrow: "Research · Global Privacy",
      title: "Global Privacy Laws",
      description:
        "Over 140 countries have enacted some form of data protection legislation. This reference covers the major privacy frameworks outside the U.S. and EU — Asia-Pacific, Latin America, the Middle East, and Africa — and the enforcement that defines them.",
      lastUpdated: "March 7, 2026",
      feedCategory: "global",
      stats: [
        { value: "140+", label: "countries with privacy laws" },
        { value: "₩5.6B", label: "PIPC fine vs. Kakao" },
        { value: "2024", label: "Korea EU adequacy" },
        { value: "POPIA", label: "South Africa in force" },
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
        content: `<p>The APAC region presents the most diverse privacy regulatory landscape. <a href="/jurisdiction/japan">Japan</a>'s <a href="/jurisdiction/japan">APPI</a> includes cross-border restrictions and an EU adequacy arrangement. <a href="/jurisdiction/south-korea">South Korea</a>'s <a href="/jurisdiction/south-korea">PIPA</a> is among the strictest globally — the <a href="/regulator/pipc">PIPC</a> imposed a ₩5.6 billion penalty on Kakao Corp in 2026. <a href="/jurisdiction/singapore">Singapore</a>'s <a href="/jurisdiction/singapore">PDPA</a>, enforced by the <a href="/regulator/pdpc">PDPC</a>, takes a consent-based approach. <a href="/jurisdiction/australia">Australia</a>'s <a href="https://www.legislation.gov.au/C2004A03712/latest" target="_blank" rel="noopener noreferrer">Privacy Act 1988</a> is undergoing significant reform; oversight by the <a href="/regulator/oaic">OAIC</a>. <a href="/jurisdiction/india">India</a>'s <a href="/jurisdiction/india">DPDP Act (2023)</a> establishes a consent-based framework. <a href="/jurisdiction/china">China</a>'s <a href="/jurisdiction/china">PIPL</a> imposes strict data localization and cross-border transfer requirements; enforced by the <a href="/regulator/cac">CAC</a>.</p>`,
      },
      {
        id: "latam",
        h2: "Latin American Privacy Frameworks",
        synthesisKey: "global__latam",
        content: `<p>Latin America is anchored by <a href="/jurisdiction/brazil">Brazil</a>'s <a href="/jurisdiction/brazil">LGPD</a>, which closely mirrors the GDPR. Brazil's <a href="/regulator/anpd">ANPD</a> issued SCC guidance in March 2026. <a href="/jurisdiction/argentina">Argentina</a>'s <a href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/norma.htm" target="_blank" rel="noopener noreferrer">Ley 25.326</a> predates GDPR and maintains EU adequacy. <a href="/jurisdiction/mexico">Mexico</a>'s <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf" target="_blank" rel="noopener noreferrer">LFPDPPP</a> is enforced by <a href="/regulator/inai">INAI</a>. <a href="/jurisdiction/colombia">Colombia</a> (regulator: <a href="/regulator/sic">SIC</a>), <a href="/jurisdiction/chile">Chile</a>, and <a href="/jurisdiction/peru">Peru</a> have enacted or modernized data protection laws.</p>`,
      },
      {
        id: "mea",
        h2: "Middle East and Africa",
        synthesisKey: "global__mea",
        content: `<p>The Middle East and Africa are the fastest-growing regions for privacy regulation. The UAE has multiple frameworks including the <a href="https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws" target="_blank" rel="noopener noreferrer">federal PDPL</a> and <a href="https://www.difc.ae/business/laws-regulations/legal-database/data-protection-law-difc-law-no-5-2020" target="_blank" rel="noopener noreferrer">DIFC</a>/<a href="https://en.adgm.thomsonreuters.com/rulebook/data-protection-regulations-2021" target="_blank" rel="noopener noreferrer">ADGM</a> regulations. <a href="/jurisdiction/saudi-arabia">Saudi Arabia</a>'s <a href="https://sdaia.gov.sa/en/SDAIA/about/Files/PersonalDataEnglish.pdf" target="_blank" rel="noopener noreferrer">PDPL</a>, enforced by <a href="/regulator/sdaia">SDAIA</a>, applies broadly. <a href="/jurisdiction/south-africa">South Africa</a>'s <a href="https://www.gov.za/documents/protection-personal-information-act" target="_blank" rel="noopener noreferrer">POPIA</a>, enforced by the <a href="/regulator/information-regulator">Information Regulator</a>, is in full effect. <a href="/jurisdiction/nigeria">Nigeria</a> (<a href="/regulator/ndpc">NDPC</a>), <a href="/jurisdiction/kenya">Kenya</a>, <a href="/jurisdiction/egypt">Egypt</a>, and <a href="/jurisdiction/ghana">Ghana</a> have enacted laws with varying enforcement capacity.</p>`,
      },
      {
        id: "enforcement",
        h2: "Global Privacy Enforcement — Key Cases",
        synthesisKey: "global__enforcement",
        content: `<p>Notable global enforcement includes Korea's <a href="/regulator/pipc">PIPC</a> <strong>₩5.6B Kakao</strong> penalty, China's <a href="/regulator/cac">CAC</a> enforcement of <a href="/jurisdiction/china">PIPL</a> cross-border requirements, and South Africa's <a href="/regulator/information-regulator">Information Regulator</a>'s expanding POPIA actions. Trends across regions: the global spread of GDPR-style legislation continues; AI-specific provisions are being integrated into privacy frameworks; children's privacy is receiving heightened attention; cross-border DPA cooperation is increasing; and data localization requirements are expanding, particularly in Asia and the Middle East.</p>`,
        toolCta: {
          toolName: "Governance Assessment",
          toolDescription:
            "Assess your privacy program against enforcement patterns from 119 regulators worldwide.",
          href: "/governance-assessment",
        },
      },
    ]}
    relatedLinks={[
      { label: "Global Privacy Authority Directory", href: "/global-privacy-authorities" },
      { label: "GDPR Enforcement", href: "/gdpr-enforcement" },
      { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
    ]}
    intelligenceUpsellTopic="global privacy law developments"
  />
);

export default GlobalPrivacyLaws;
