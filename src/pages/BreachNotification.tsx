import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";
import { getProduct } from "@/lib/productRegistry";
import { linkGlossaryFirstMentions } from "@/lib/linkGlossaryTerms";

export default function BreachNotificationPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="/breach-notification" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Data Breach Notification Requirements by Jurisdiction",
          "description": "Comprehensive guide to global data breach notification obligations for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        adAfterHeader={false}
        metaTitle="Data Breach Notification Requirements | End User Privacy"
        metaDescription="Reference on global breach notification obligations: GDPR's 72-hour rule, all 50 U.S. state laws, sector-specific federal requirements, and 20+ international frameworks."
        header={{
          eyebrow: "Research · Breach Notification",
          title: "Data Breach Notification Requirements by Jurisdiction",
          statuteCite: "GDPR Art. 33 · 72-hour supervisory-authority notification",
          description:
            "Breach notification is the most operationally consequential area of privacy law: when something goes wrong, the clock starts immediately and the requirements vary by jurisdiction, sector, and data type. This reference consolidates the obligations you need to know.",
          lastUpdated: "June 10, 2026",
          feedCategory: "data-breach",
          stats: [
            { value: "72h", label: "GDPR notification window" },
            { value: "50", label: "US state laws tracked" },
            { value: "€7B+", label: "GDPR fines to date" },
            { value: "60d", label: "HIPAA breach window" },
          ],
        }}
        atAGlance={[
          { label: "GDPR clock", value: "72 hours to supervisory authority (Art. 33)" },
          { label: "HIPAA clock", value: "60 days to individuals; 60 days to HHS (annual for <500)" },
          { label: "Toughest US timing", value: "Florida / Colorado / Washington — 30 days" },
          { label: "Broadest trigger", value: "California — unauthorized access, not just acquisition" },
        ]}
        merchandisingRail={{
          heading: "Use this in your workflow",
          items: [
            { label: "Incident-Response Playbook", href: "/ir-playbook", description: "Jurisdiction-specific breach runbook generated for your stack." },
            { label: "Full International Breach Notice", href: "/breach-notification#international", description: "Reference the 20+ non-EU regimes side-by-side." },
            { label: "Weekly Enforcement Intelligence", href: "/subscribe", description: "Every material breach-related enforcement action, curated weekly." },
          ],
        }}

        pageSynthesisKey="breach__page"
        topToolCta={{
          toolName: getProduct("ir-playbook").name,
          toolDescription:
            "A structured, jurisdiction-specific incident response guide generated for your organization. Covers GDPR, HIPAA, and active U.S. state laws.",
          href: getProduct("ir-playbook").route,
          context: "Put this into practice:",
        }}
        sections={linkGlossaryFirstMentions([
          {
            id: "gdpr",
            h2: "GDPR Breach Notification — Articles 33 and 34",
            synthesisKey: "breach__gdpr",
            legalRequirement:
              "Controllers must notify the lead supervisory authority within 72 hours of becoming aware of a personal data breach unless it is unlikely to result in a risk to data subjects (Art. 33), and must communicate directly to affected individuals without undue delay where the breach is likely to result in a high risk (Art. 34). Processors notify controllers without undue delay. The clock starts at a reasonable degree of certainty that a breach occurred — not when the investigation closes.",
            readTheText: [
              { label: "GDPR Art. 33", href: "https://gdpr-info.eu/art-33-gdpr/" },
              { label: "GDPR Art. 34", href: "https://gdpr-info.eu/art-34-gdpr/" },
              { label: "EDPB Guidelines 9/2022", href: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en" },
            ],
            content: `<p>The <a href="https://gdpr-info.eu/art-33-gdpr/" target="_blank" rel="noopener noreferrer">GDPR</a> established the benchmark for modern breach notification. Controllers must notify the supervisory authority <strong>within 72 hours</strong> of becoming aware of a breach unless it is unlikely to result in risk. Communication to data subjects is required when the breach is likely to result in a "high risk" to individuals' rights and freedoms. Processors must notify controllers without undue delay.</p>
<p>Enforcement examples: <strong>British Airways</strong> — <a href="/regulator/ico">Information Commissioner's Office (ICO)</a> fined £20M; <strong>Marriott</strong> — £18.4M for the Starwood breach; <strong>Meta/Facebook</strong> — <a href="/regulator/dpc">Data Protection Commission (DPC)</a> fined €265M for a scraping incident exposing 533M users' data.</p>`,
          },
          {
            id: "us-states",
            h2: "U.S. State Breach Notification Laws",
            synthesisKey: "breach__us_states",
            legalRequirement:
              "All 50 states, D.C. and the territories impose notification duties. Most trigger on unauthorized acquisition of personal information; California and Florida use the broader access standard. Timing runs from \"without unreasonable delay\" to fixed 30/45/60-day windows, and many states require simultaneous notice to the Attorney General. California adds a private right of action with statutory damages of $100–$750 per consumer per incident where reasonable security was not maintained.",
            readTheText: [
              { label: "Cal. Civ. Code § 1798.82", href: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82" },
              { label: "Cal. Civ. Code § 1798.150", href: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.150" },
              { label: "Fla. Stat. § 501.171", href: "https://www.flsenate.gov/Laws/Statutes/2023/501.171" },
            ],
            content: `<p>All 50 <a href="/us-state-privacy-laws">U.S. states</a> plus D.C. and U.S. territories have breach notification laws. Most require notification when there is unauthorized <strong>acquisition</strong> of personal information; California and Florida use a broader unauthorized <strong>access</strong> standard. Timing varies: most states require notification "without unreasonable delay"; Florida, Colorado and Washington require 30 days; Ohio and Wisconsin 45 days; Connecticut 60 days.</p>
<p>Many states require simultaneous notification to the AG. California provides a private right of action with statutory damages of $100–$750 per consumer per incident under <a href="/us-state-privacy-laws">CCPA/CPRA</a> for breaches resulting from failure to implement reasonable security.</p>`,
          },
          {
            id: "sector",
            h2: "Sector-Specific U.S. Breach Requirements",
            synthesisKey: "breach__sector_specific",
            legalRequirement:
              "Sector regulators layer duties on top of state law: HIPAA requires notice to individuals and HHS within 60 days (plus media for breaches of 500+); the federal banking agencies require notification within 36 hours; SEC Reg S-K Item 1.05 requires an Item 1.05 Form 8-K within four business days of a materiality determination; and the FTC Health Breach Notification Rule reaches non-HIPAA health data.",
            readTheText: [
              { label: "45 CFR §§ 164.400–414", href: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-D" },
              { label: "17 CFR § 229.106", href: "https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.100/section-229.106" },
              { label: "16 CFR Part 318 (HBNR)", href: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-318" },
            ],
            content: `<ul>
<li><strong><a href="/us-federal-privacy-law">HIPAA</a> (Health)</strong> — covered entities must notify <a href="https://www.hhs.gov/ocr" target="_blank" rel="noopener noreferrer">HHS</a>, affected individuals, and media (for breaches of 500+) within 60 days.</li>
<li><strong><a href="/us-federal-privacy-law">GLBA</a> / Interagency Guidance (Financial)</strong> — banking regulators require notification within 36 hours for incidents that could impact services.</li>
<li><strong><a href="https://www.sec.gov/news/press-release/2023-139" target="_blank" rel="noopener noreferrer">SEC Rules</a> (Public Companies)</strong> — material cybersecurity incidents must be disclosed in Form 8-K within 4 business days.</li>
<li><strong><a href="https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule" target="_blank" rel="noopener noreferrer">FTC Health Breach Notification Rule</a></strong> — non-HIPAA entities handling health data must notify <a href="/regulator/ftc">Federal Trade Commission (FTC)</a> and affected individuals within 60 days.</li>
</ul>`,
          },
          {
            id: "international",
            h2: "International Breach Notification",
            synthesisKey: "breach__international",
            legalRequirement:
              "Thresholds and clocks diverge outside the EU. The UK mirrors the 72-hour rule; Canada's PIPEDA turns on a \"real risk of significant harm\"; Australia's NDB scheme allows a 30-day assessment period before the duty crystallises; Brazil's LGPD requires notice within a reasonable time (ANPD recommends two business days); and China's PIPL requires immediate notification to the regulator and affected individuals.",
            readTheText: [
              { label: "UK GDPR Art. 33", href: "https://www.legislation.gov.uk/eur/2016/679/article/33" },
              { label: "PIPEDA s.10.1", href: "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/section-10.1.html" },
              { label: "Privacy Act 1988 Pt IIIC (NDB)", href: "https://www.legislation.gov.au/C2004A03712/latest/text" },
            ],
            content: `<ul>
<li><strong><a href="/jurisdiction/united-kingdom">UK GDPR</a></strong> — mirrors EU GDPR's 72-hour requirement; enforced by the <a href="/regulator/ico">ICO</a>.</li>
<li><strong><a href="/jurisdiction/canada">Canada PIPEDA</a></strong> — notification required when breach creates a "real risk of significant harm"; oversight by the <a href="/regulator/opc">Office of the Privacy Commissioner of Canada (OPC)</a>.</li>
<li><strong><a href="/jurisdiction/australia">Australia NDB Scheme</a></strong> — notification to <a href="/regulator/oaic">Office of the Australian Information Commissioner (OAIC)</a> for "eligible data breaches"; 30-day assessment period.</li>
<li><strong><a href="/jurisdiction/brazil">Brazil LGPD</a></strong> — notification to <a href="/regulator/anpd">National Data Protection Authority (ANPD)</a> within a "reasonable time" (ANPD recommends 2 business days).</li>
<li><strong><a href="/jurisdiction/china">China PIPL</a></strong> — immediate notification to authorities (<a href="/regulator/cac">Cyberspace Administration of China (CAC)</a>) and affected individuals.</li>
<li><strong><a href="/jurisdiction/india">India DPDP Act</a></strong> — notification to Data Protection Board "without delay".</li>
<li><strong><a href="/jurisdiction/japan">Japan APPI</a></strong> — notification to <a href="/regulator/ppc">Personal Information Protection Commission (PPC)</a> for breaches affecting 1,000+ individuals or sensitive data.</li>
</ul>`,
          },
        ])}
        relatedLinks={[
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "Health Data Privacy", href: "/health-data-privacy" },
          { label: "Jurisdictions Map", href: "/jurisdictions" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="breach notification"
      />
    </>
  );
}
