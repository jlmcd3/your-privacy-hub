import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";

export default function CookieConsentPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://enduserprivacy.com/cookie-consent" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cookie Consent Requirements by Jurisdiction",
          "description": "Comprehensive guide to global cookie consent requirements for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="Cookie Consent Requirements by Jurisdiction | End User Privacy"
        metaDescription="Reference for cookie consent under GDPR, ePrivacy, CCPA/CPRA, and U.S. state privacy laws — with enforcement examples and compliance checklists."
        header={{
          eyebrow: "Research · Cookie Consent",
          title: "Cookie Consent Requirements by Jurisdiction",
          description:
            "Cookie consent is one of the most actively enforced areas of privacy law, with CNIL alone issuing over €200M in fines. This reference covers GDPR, ePrivacy, and the U.S. state opt-out regimes you need to support.",
          lastUpdated: "March 24, 2026",
          feedCategory: "adtech-consent",
          stats: [
            { value: "€150M", label: "CNIL Google fine" },
            { value: "€60M", label: "CNIL Facebook fine" },
            { value: "€250K", label: "IAB Europe TCF fine" },
            { value: "100+", label: "ICO notices issued" },
          ],
        }}
        pageSynthesisKey="cookie__page"
        topToolCta={{
          toolName: "EU/Global Privacy Notice Builder",
          toolDescription:
            "Generate a GDPR-compliant privacy notice covering cookie consent, legal basis, and data subject rights.",
          href: "/eu-notice-builder",
        }}
        sections={[
          {
            id: "gdpr-eprivacy",
            h2: "Cookie Consent Under GDPR and the ePrivacy Directive",
            synthesisKey: "cookie__gdpr_eprivacy",
            content: `<p>Under the GDPR (<a href="https://gdpr-info.eu/art-6-gdpr/" target="_blank" rel="noopener noreferrer">Art. 6</a>, <a href="https://gdpr-info.eu/art-7-gdpr/" target="_blank" rel="noopener noreferrer">Art. 7</a>) and the <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058" target="_blank" rel="noopener noreferrer">ePrivacy Directive (Article 5(3))</a>, websites operating in the EU must obtain prior consent before placing non-essential cookies, provide clear information about each cookie's purpose and recipients, make refusal as easy as acceptance, keep records of consent, and allow withdrawal at any time.</p>
<p>The <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en" target="_blank" rel="noopener noreferrer">EDPB Guidelines 05/2020 on Consent</a> clarify that scrolling or continued use does not constitute valid consent.</p>`,
          },
          {
            id: "us-tracking",
            h2: "U.S. Cookie and Online Tracking Consent Requirements",
            synthesisKey: "cookie__us_tracking",
            content: `<p>While no federal U.S. law directly regulates cookies, several state privacy laws impose consent-like obligations for online tracking. <strong>California (<a href="/us-state-privacy-laws">CPRA/CCPA</a>)</strong> requires opt-out mechanisms for "sale" or "sharing" of personal information through cookies, with the <a href="https://cppa.ca.gov/regulations/" target="_blank" rel="noopener noreferrer">CPPA's published regulations</a> setting the technical standard. <strong><a href="/us-state-privacy-laws">Colorado, Connecticut, Virginia, Oregon, and Texas</a></strong> require honoring universal opt-out signals such as <a href="https://globalprivacycontrol.org/" target="_blank" rel="noopener noreferrer">Global Privacy Control (GPC)</a>. The <a href="https://cppa.ca.gov/regulations/automated_decisionmaking.html" target="_blank" rel="noopener noreferrer">California ADMT Rules</a> further extend obligations to AI-driven profiling enabled by cookie data.</p>`,
          },
          {
            id: "enforcement",
            h2: "Cookie Enforcement — DPA Actions and Fines",
            synthesisKey: "cookie__enforcement",
            content: `<ul>
<li><strong><a href="/regulator/cnil">CNIL (France)</a></strong> — fined Google €150M and Facebook €60M (2022) for making cookie refusal harder than acceptance.</li>
<li><strong><a href="/regulator/apdgba">Belgian APD</a></strong> — fined IAB Europe €250K over the TCF framework's legal basis.</li>
<li><strong><a href="/regulator/ico">ICO (UK)</a></strong> — issued formal warnings to over 100 top <a href="/jurisdiction/united-kingdom">UK</a> websites about non-compliant banners.</li>
<li><strong><a href="/regulator/aepd">AEPD (Spain)</a></strong> — fined companies for pre-ticked consent boxes.</li>
</ul>`,
            toolCta: {
              toolName: "Governance Assessment",
              toolDescription:
                "Assess your cookie consent program against CNIL, ICO, and EDPB enforcement patterns.",
              href: "/governance-assessment",
            },
          },
        ]}
        relatedLinks={[
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "AdTech & Consent Hub", href: "/topics/adtech" },
          { label: "Jurisdictions Map", href: "/jurisdictions" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="cookie consent and online tracking"
      />
    </>
  );
}
