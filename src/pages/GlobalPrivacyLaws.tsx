import PillarPage from "@/components/PillarPage";

const GlobalPrivacyLaws = () => (
  <PillarPage
    title="Global Privacy Laws"
    subtitle="Comparative guide to privacy regulation outside the U.S. and EU, covering APAC, Latin America, Middle East, and Africa frameworks."
    icon="🌐"
    lastUpdated="March 7, 2026"
    intro="Data protection and privacy regulation has become a global phenomenon, with over 140 countries having enacted some form of data protection legislation. While the EU's GDPR remains the most influential framework, jurisdictions across Asia-Pacific, Latin America, the Middle East, and Africa have developed their own approaches — some closely aligned with GDPR, others reflecting distinct regulatory philosophies. This guide provides a comparative overview of major privacy frameworks outside the United States and European Union."
    sections={[
      {
        heading: "Asia-Pacific Privacy Frameworks",
        content: "The APAC region presents the most diverse privacy regulatory landscape. Japan's Act on Protection of Personal Information (APPI), amended in 2022, includes cross-border transfer restrictions and an adequacy arrangement with the EU. South Korea's Personal Information Protection Act (PIPA) is among the strictest globally, with the Personal Information Protection Commission (PIPC) imposing significant fines, including a ₩5.6 billion penalty against Kakao Corp in 2026. Singapore's Personal Data Protection Act (PDPA) takes a consent-based approach with mandatory breach notification. Australia's Privacy Act 1988 is undergoing significant reform following a 2023 review recommending stronger individual rights. India's Digital Personal Data Protection Act (2023) establishes a consent-based framework with a new Data Protection Board. China's Personal Information Protection Law (PIPL) imposes strict data localization and cross-border transfer requirements."
      },
      {
        heading: "Latin American Frameworks",
        content: "Latin America's privacy landscape is anchored by Brazil's LGPD (Lei Geral de Proteção de Dados), which closely mirrors the GDPR in structure and rights. Brazil's ANPD issued guidance in March 2026 establishing standard contractual clauses for international data transfers. Argentina's personal data protection law predates GDPR and maintains an EU adequacy determination. Mexico's Federal Law on Protection of Personal Data Held by Private Parties is enforced by INAI, though the agency has faced institutional challenges. Colombia, Chile, and Peru have enacted or modernized data protection laws with varying degrees of enforcement activity."
      },
      {
        heading: "Middle East and Africa",
        content: "The Middle East and Africa represent the fastest-growing regions for privacy regulation. The UAE has multiple frameworks including the federal Personal Data Protection Law and DIFC/ADGM regulations in financial free zones. Saudi Arabia's Personal Data Protection Law, enforced by SDAIA, applies broadly to data processing within the Kingdom. South Africa's Protection of Personal Information Act (POPIA), enforced by the Information Regulator, has been in full effect since 2021 with increasing enforcement activity. Nigeria, Kenya, Egypt, and Ghana have enacted data protection laws, though enforcement capacity varies significantly across the continent."
      },
      {
        heading: "Cross-Border Data Transfers",
        content: "International data transfers remain one of the most challenging compliance areas. Approaches vary from the EU's adequacy decisions and standard contractual clauses, to APEC's Cross-Border Privacy Rules (CBPR), to data localization requirements in jurisdictions like China, India, and Russia. The proliferation of national data protection laws has created a complex web of transfer requirements. Key developments include: Brazil's SCC framework (March 2026), Japan-EU mutual adequacy, the EU-US Data Privacy Framework, and increasing use of binding corporate rules for multinational organizations."
      },
      {
        heading: "Trends in Global Privacy Regulation",
        content: "Several trends are shaping the global privacy landscape: the global spread of GDPR-style legislation continues with new laws in the Middle East and Africa; AI-specific provisions are being integrated into privacy frameworks worldwide; children's privacy is receiving heightened attention across jurisdictions; enforcement activity is accelerating in previously low-activity jurisdictions; cross-border cooperation between DPAs is increasing; and data localization requirements are expanding, particularly in Asia and the Middle East. Organizations operating globally must maintain awareness of this rapidly evolving regulatory environment."
      },
    ]}
    relatedLinks={[
      { label: "Global Privacy Authority Directory", href: "/global-privacy-authorities" },
      { label: "GDPR Enforcement", href: "/gdpr-enforcement" },
      { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
    ]}
    directoryLink={{ label: "Browse All Global Authorities", href: "/global-privacy-authorities" }}
  />
);

export default GlobalPrivacyLaws;
