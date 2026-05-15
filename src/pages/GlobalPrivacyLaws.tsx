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
    sections={[
      {
        id: "apac",
        h2: "Asia-Pacific Data Protection Laws",
        synthesisKey: "global__apac",
        content: `<p>The APAC region presents the most diverse privacy regulatory landscape. Japan's <a href="https://www.ppc.go.jp/en/legal/" target="_blank" rel="noopener noreferrer">APPI</a> includes cross-border restrictions and an EU adequacy arrangement. South Korea's <a href="https://www.pipc.go.kr/eng/user/lgp/law/personalInfoProtectionAct.do" target="_blank" rel="noopener noreferrer">PIPA</a> is among the strictest globally — the <a href="https://www.pipc.go.kr/eng/" target="_blank" rel="noopener noreferrer">PIPC</a> imposed a ₩5.6 billion penalty on Kakao Corp in 2026. Singapore's <a href="https://www.pdpc.gov.sg/Overview-of-PDPA/The-Legislation/Personal-Data-Protection-Act" target="_blank" rel="noopener noreferrer">PDPA</a> takes a consent-based approach. Australia's <a href="https://www.legislation.gov.au/C2004A03712/latest" target="_blank" rel="noopener noreferrer">Privacy Act 1988</a> is undergoing significant reform. India's <a href="https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf" target="_blank" rel="noopener noreferrer">DPDP Act (2023)</a> establishes a consent-based framework. China's <a href="http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559.htm" target="_blank" rel="noopener noreferrer">PIPL</a> imposes strict data localization and cross-border transfer requirements.</p>`,
      },
      {
        id: "latam",
        h2: "Latin American Privacy Frameworks",
        synthesisKey: "global__latam",
        content: `<p>Latin America is anchored by Brazil's <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noopener noreferrer">LGPD</a>, which closely mirrors the GDPR. Brazil's <a href="https://www.gov.br/anpd/pt-br" target="_blank" rel="noopener noreferrer">ANPD</a> issued SCC guidance in March 2026. Argentina's <a href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/norma.htm" target="_blank" rel="noopener noreferrer">Ley 25.326</a> predates GDPR and maintains EU adequacy. Mexico's <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf" target="_blank" rel="noopener noreferrer">LFPDPPP</a> is enforced by <a href="https://home.inai.org.mx/" target="_blank" rel="noopener noreferrer">INAI</a>. <a href="https://www.sic.gov.co/proteccion-de-datos-personales" target="_blank" rel="noopener noreferrer">Colombia</a>, <a href="https://www.bcn.cl/leychile/navegar?idNorma=141599" target="_blank" rel="noopener noreferrer">Chile</a>, and <a href="https://www.gob.pe/institucion/minjus/normas-legales/243470-29733" target="_blank" rel="noopener noreferrer">Peru</a> have enacted or modernized data protection laws.</p>`,
      },
      {
        id: "mea",
        h2: "Middle East and Africa",
        synthesisKey: "global__mea",
        content: `<p>The Middle East and Africa are the fastest-growing regions for privacy regulation. The UAE has multiple frameworks including the <a href="https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws" target="_blank" rel="noopener noreferrer">federal PDPL</a> and <a href="https://www.difc.ae/business/laws-regulations/legal-database/data-protection-law-difc-law-no-5-2020" target="_blank" rel="noopener noreferrer">DIFC</a>/<a href="https://en.adgm.thomsonreuters.com/rulebook/data-protection-regulations-2021" target="_blank" rel="noopener noreferrer">ADGM</a> regulations. Saudi Arabia's <a href="https://sdaia.gov.sa/en/SDAIA/about/Files/PersonalDataEnglish.pdf" target="_blank" rel="noopener noreferrer">PDPL</a>, enforced by <a href="https://sdaia.gov.sa/en/" target="_blank" rel="noopener noreferrer">SDAIA</a>, applies broadly. South Africa's <a href="https://www.gov.za/documents/protection-personal-information-act" target="_blank" rel="noopener noreferrer">POPIA</a>, enforced by the <a href="https://inforegulator.org.za/" target="_blank" rel="noopener noreferrer">Information Regulator</a>, is in full effect. <a href="https://ndpc.gov.ng/" target="_blank" rel="noopener noreferrer">Nigeria</a>, <a href="https://www.odpc.go.ke/" target="_blank" rel="noopener noreferrer">Kenya</a>, <a href="https://www.dpc.gov.eg/" target="_blank" rel="noopener noreferrer">Egypt</a>, and <a href="https://www.dataprotection.org.gh/" target="_blank" rel="noopener noreferrer">Ghana</a> have enacted laws with varying enforcement capacity.</p>`,
      },
      {
        id: "enforcement",
        h2: "Global Privacy Enforcement — Key Cases",
        synthesisKey: "global__enforcement",
        content: `<p>Notable global enforcement includes Korea's PIPC <strong>₩5.6B Kakao</strong> penalty, China's CAC enforcement of PIPL cross-border requirements, and South Africa's Information Regulator's expanding POPIA actions. Trends across regions: the global spread of GDPR-style legislation continues; AI-specific provisions are being integrated into privacy frameworks; children's privacy is receiving heightened attention; cross-border DPA cooperation is increasing; and data localization requirements are expanding, particularly in Asia and the Middle East.</p>`,
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
