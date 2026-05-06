import { Helmet } from "react-helmet-async";
import PillarPage from "@/components/PillarPage";
import { INTELLIGENCE_PRICING } from "@/config/pricing";

const SECTIONS = [
  {
    heading: "What Is Cookie Consent?",
    content: `Cookie consent refers to the legal requirement for websites to obtain users' informed permission before placing non-essential cookies or similar tracking technologies on their devices. This obligation derives from the EU's <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0136" target="_blank" rel="noopener noreferrer">ePrivacy Directive (2009/136/EC)</a>, reinforced by the <a href="https://gdpr-info.eu/" target="_blank" rel="noopener noreferrer">GDPR</a>, and increasingly mirrored in U.S. state privacy laws.\n\nThe core principle is simple: unless a cookie is "strictly necessary" for the website to function (e.g., session authentication, shopping cart), the website must obtain active, informed consent before setting it. Pre-ticked boxes, implied consent from continued browsing, and "cookie walls" that block access without consent are generally prohibited under EU law.`,
  },
  {
    heading: "GDPR & ePrivacy Requirements",
    content: `Under the GDPR (<a href="https://gdpr-info.eu/art-6-gdpr/" target="_blank" rel="noopener noreferrer">Articles 6</a>, <a href="https://gdpr-info.eu/art-7-gdpr/" target="_blank" rel="noopener noreferrer">7</a>) and the <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058" target="_blank" rel="noopener noreferrer">ePrivacy Directive (Article 5(3))</a>, websites operating in the EU must:\n\n• **Obtain prior consent** before placing non-essential cookies\n• **Provide clear information** about each cookie's purpose, duration, and data recipients\n• **Make refusal as easy as acceptance** — no dark patterns, no asymmetric button styling\n• **Keep records of consent** that can demonstrate compliance\n• **Allow withdrawal** of consent at any time, as easily as it was given\n\nThe <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en" target="_blank" rel="noopener noreferrer">EDPB Guidelines 05/2020 on Consent</a> further clarify that scrolling or continued use does not constitute valid consent. Multiple DPAs — particularly <a href="https://www.cnil.fr/en" target="_blank" rel="noopener noreferrer">CNIL</a>, the <a href="https://www.dsb.gv.at/" target="_blank" rel="noopener noreferrer">Austrian DSB</a>, and the <a href="https://www.dataprotectionauthority.be/" target="_blank" rel="noopener noreferrer">Belgian APD</a> — have issued significant fines for cookie consent violations.`,
  },
  {
    heading: "U.S. State Cookie & Tracking Laws",
    content: `While no federal U.S. law directly regulates cookies, several state privacy laws impose consent-like requirements for online tracking:\n\n• **California (<a href="https://cppa.ca.gov/regulations/" target="_blank" rel="noopener noreferrer">CPRA/CCPA</a>):** Requires opt-out mechanisms for "sale" or "sharing" of personal information, including through cookies. The <a href="https://cppa.ca.gov/" target="_blank" rel="noopener noreferrer">CPPA</a> is actively enforcing cookie compliance as part of its broader Privacy Rights Act enforcement.\n• **<a href="https://coag.gov/resources/colorado-privacy-act/" target="_blank" rel="noopener noreferrer">Colorado</a>, <a href="https://portal.ct.gov/AG/Sections/Privacy/The-Connecticut-Data-Privacy-Act" target="_blank" rel="noopener noreferrer">Connecticut</a>, <a href="https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" target="_blank" rel="noopener noreferrer">Virginia</a>, <a href="https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html" target="_blank" rel="noopener noreferrer">Oregon</a>, <a href="https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" target="_blank" rel="noopener noreferrer">Texas</a>:** All require honoring universal opt-out mechanisms (<a href="https://globalprivacycontrol.org/" target="_blank" rel="noopener noreferrer">Global Privacy Control / GPC</a>) and providing opt-out for targeted advertising, which frequently involves cookies.\n• **<a href="https://cppa.ca.gov/regulations/automated_decisionmaking.html" target="_blank" rel="noopener noreferrer">California ADMT Rules</a> (April 2026):** New automated decision-making technology rules will extend consent obligations to AI-driven profiling enabled by cookie data.\n\nThe practical effect: any website with U.S. traffic should implement a Consent Management Platform (CMP) that supports both EU-style opt-in consent and U.S.-style opt-out mechanisms.`,
  },
  {
    heading: "Enforcement Examples",
    content: `Cookie consent enforcement has been among the most active areas of DPA action:\n\n• **<a href="https://www.cnil.fr/en" target="_blank" rel="noopener noreferrer">CNIL (France)</a>:** Fined <a href="https://www.cnil.fr/en/cookies-google-fined-150-million-euros" target="_blank" rel="noopener noreferrer">Google €150M</a> and <a href="https://www.cnil.fr/en/cookies-facebook-ireland-limited-fined-60-million-euros" target="_blank" rel="noopener noreferrer">Facebook €60M</a> (2022) for making cookie refusal harder than acceptance. Has since issued 100+ formal notices to websites.\n• **<a href="https://www.dsb.gv.at/" target="_blank" rel="noopener noreferrer">Austrian DSB</a>:** Referred multiple complaints against cookie banners to the CJEU, leading to landmark rulings on consent validity.\n• **<a href="https://www.dataprotectionauthority.be/" target="_blank" rel="noopener noreferrer">Belgian APD</a>:** Fined <a href="https://www.dataprotectionauthority.be/citizen/belgian-dpa-rules-against-iab-europe-tcf" target="_blank" rel="noopener noreferrer">IAB Europe €250K</a> over the TCF framework's legal basis for cookie consent processing.\n• **<a href="https://ico.org.uk/" target="_blank" rel="noopener noreferrer">ICO (UK)</a>:** Issued <a href="https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/" target="_blank" rel="noopener noreferrer">guidance on cookie compliance</a> and has warned over 100 top UK websites about non-compliant banners.\n• **<a href="https://www.aepd.es/en" target="_blank" rel="noopener noreferrer">AEPD (Spain)</a>:** Has published detailed cookie guidance and fined companies for pre-ticked consent boxes.`,
  },
  {
    heading: "Best Practices for Cookie Compliance",
    content: `1. **Implement a certified CMP** that supports both GDPR opt-in and U.S. opt-out models\n2. **Categorize all cookies** as strictly necessary, functional, analytics, or marketing\n3. **Block non-essential cookies by default** until consent is obtained\n4. **Honor <a href="https://globalprivacycontrol.org/" target="_blank" rel="noopener noreferrer">Global Privacy Control (GPC)</a>** signals as an opt-out under applicable state laws\n5. **Audit cookie compliance quarterly** — new scripts, SDKs, and tags constantly introduce new cookies\n6. **Document your cookie inventory** including purpose, retention period, and data recipients\n7. **Test consent flows** on mobile and desktop — ensure refusal is as easy as acceptance`,
  },
];

export default function CookieConsentPage() {
  return (
    <>
      <Helmet>
        <title>Cookie Consent Requirements by Jurisdiction | End User Privacy</title>
        <meta name="description" content="Comprehensive guide to cookie consent requirements under GDPR, ePrivacy, CCPA/CPRA, and U.S. state privacy laws. Enforcement examples, best practices, and compliance checklists." />
        <meta property="og:title" content="Cookie Consent Requirements by Jurisdiction" />
        <meta property="og:description" content="Complete cookie consent compliance guide covering GDPR, ePrivacy, and U.S. state laws." />
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
      <PillarPage
        title="Cookie Consent Requirements by Jurisdiction"
        subtitle="Everything privacy professionals need to know about cookie consent obligations under GDPR, the ePrivacy Directive, CCPA/CPRA, and emerging U.S. state laws — with enforcement examples and compliance checklists."
        icon="🍪"
        lastUpdated="March 24, 2026"
        intro="Cookie consent is one of the most actively enforced areas of privacy law, with CNIL alone issuing over €200M in fines. This guide covers every framework you need to know."
        sections={SECTIONS}
        relatedLinks={[
          { label: "📊 Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "🍪 AdTech & Consent Hub", href: "/topics/adtech" },
          { label: "🌍 Jurisdictions Map", href: "/jurisdictions" },
          { label: `⭐ Intelligence Plan — ${INTELLIGENCE_PRICING.monthly()}`, href: "/subscribe" },
        ]}
        intelligenceLabel="What changed in cookie consent this week"
        updateOrFilter="title.ilike.%cookie%,title.ilike.%consent%,title.ilike.%CMP%,topic_tags.cs.{adtech-consent}"
        heroStats={[
          { value: "€150M", label: "CNIL Google fine" },
          { value: "€60M", label: "CNIL Facebook fine" },
          { value: "€250K", label: "IAB Europe TCF fine" },
          { value: "100+", label: "ICO notices issued" },
        ]}
        emailCaptureText="Get cookie compliance alerts as enforcement evolves"
        midPageCtaMessage="Intelligence subscribers see every new DPA cookie enforcement action, CMP guidance update, and state opt-out rule change — synthesized weekly."
      />
    </>
  );
}
