import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";
import { getProduct } from "@/lib/productRegistry";
import { linkGlossaryFirstMentions } from "@/lib/linkGlossaryTerms";

const AIPrivacyRegulations = () => (
  <>
    <Helmet>
      <link rel="canonical" href="https://enduserprivacy.com/ai-privacy-regulations" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "AI Privacy Regulations — EU AI Act, GDPR, ADMT",
        "description": "Global overview of AI-specific privacy regulation: the EU AI Act, GDPR and AI training, national AI strategies, automated decision-making, and emerging enforcement.",
        "publisher": { "@type": "Organization", "name": "End User Privacy" },
        "datePublished": "2025-02-10",
        "dateModified": "2026-06-10",
      })}</script>
    </Helmet>
  <ResearchPageLayout
    metaTitle="AI Privacy Regulations — EU AI Act, GDPR, ADMT | End User Privacy"
    metaDescription="Global overview of AI-specific privacy regulation: the EU AI Act, GDPR and AI training, national AI strategies, automated decision-making, and emerging enforcement."
    header={{
      eyebrow: "Research · AI & Privacy",
      title: "AI Privacy Regulations",
      description:
        "AI regulation is moving faster than any other area of privacy law. EDPB Opinion 28/2024 (adopted 17 December 2024) on personal data in AI models is the most significant regulatory statement at the AI–privacy intersection. The EU AI Act's high-risk provisions are phasing in through 2027. California's ADMT rules are effective. This reference covers the frameworks, the enforcement, and what each means for your compliance program.",
      lastUpdated: "June 10, 2026",
      feedCategory: "ai-privacy",
      stats: [
        { value: "Aug 2024", label: "EU AI Act in force" },
        { value: "Art. 22", label: "GDPR right against ADM" },
        { value: "Dec 2024", label: "EDPB Opinion 28/2024 on AI models" },
        { value: "Jan 2026", label: "CPPA ADMT rules effective" },
      ],
    }}
    pageSynthesisKey="ai_privacy__page"
    topToolCta={{
      toolName: getProduct("governance-assessment").name,
      toolDescription:
        "Assess your AI governance program against the EU AI Act, GDPR Article 22, and CPPA ADMT enforcement patterns.",
      href: getProduct("governance-assessment").route,
    }}
    introBlock={
      <div className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 px-5 py-4">
        <div className="text-[11px] font-bold tracking-wider uppercase text-brand-teal mb-1.5">
          Why this matters now
        </div>
        <p className="text-sm text-brand-navy leading-relaxed m-0">
          AI compliance is no longer prospective. The EU AI Act's prohibitions and
          general-purpose-model obligations are live, EDPB Opinion 28/2024 on AI training data guides supervisory authorities across the EEA, and
          California's CPPA adopted its ADMT regulations in July 2025 (OAL-approved September 23, 2025; effective January 1, 2026) — first
          enforcement actions are expected H2 2026.
        </p>
      </div>
    }
    sections={linkGlossaryFirstMentions([
      {
        id: "eu-ai-act",
        h2: "The EU AI Act",
        synthesisKey: "ai_privacy__eu_ai_act",
        complianceTrigger:
          "Applies if you place an AI system on the EU market, put one into service in the EU, or your AI system's output is used in the EU — regardless of where you're established.",
        toolCtaPlacement: "top",
        toolCta: {
          toolName: "Impact Assessment Builder",
          toolDescription: "High-risk AI systems under the EU AI Act and GDPR Article 35 require a DPIA. Generate one structured to EDPB WP 248 requirements.",
          href: "/dpia-framework",
        },
        content: `<p>The <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" target="_blank" rel="noopener noreferrer">EU AI Act</a>, which entered into force in August 2024 with phased implementation through 2027, establishes the world's first comprehensive regulatory framework specifically for artificial intelligence. The Act classifies AI systems by risk level — unacceptable, high-risk, limited, and minimal — and imposes corresponding obligations. <a href="https://artificialintelligenceact.eu/annex/3/" target="_blank" rel="noopener noreferrer">High-risk AI systems</a> used in areas like employment, credit scoring, and law enforcement face requirements for conformity assessments, risk management systems, data governance, transparency, human oversight, and accuracy monitoring. The Act's interaction with the <a href="https://gdpr-info.eu/" target="_blank" rel="noopener noreferrer">GDPR</a> creates a dual compliance requirement for AI systems processing personal data.</p>`,
      },
      {
        id: "gdpr-ai-training",
        h2: "GDPR and AI Training Data",
        synthesisKey: "ai_privacy__gdpr_ai",
        complianceTrigger:
          "Applies if you train, fine-tune, or deploy a model using personal data of EU/EEA individuals — including scraped public web data.",
        toolCtaPlacement: "top",
          toolCta: {
            toolName: "Legitimate Interest Assessment",
            toolDescription: "The EDPB's Opinion 28/2024 requires a documented balancing test for each AI training use case. Generate a structured LIA aligned to EDPB guidance.",
            href: "/li-assessment",
          },
        content: `<p>The <a href="/regulator/edpb">European Data Protection Board (EDPB)</a>'s <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-data-protection-aspects_en" target="_blank" rel="noopener noreferrer">Opinion 28/2024</a> on personal data in AI model training is the most significant regulatory statement at the AI–privacy intersection. The opinion establishes that training large language models on scraped personal data without a valid legal basis constitutes a GDPR violation. Controllers must identify a legal basis under <a href="https://gdpr-info.eu/art-6-gdpr/" target="_blank" rel="noopener noreferrer">Article 6</a> for each distinct phase of AI development: data collection, pre-processing, and model training. Legitimate interest cannot be automatically assumed; controllers must conduct and document a balancing test for each use case.</p>`,
      },
      {
        id: "admt",
        h2: "Automated Decision-Making (CPPA ADMT)",
        synthesisKey: "ai_privacy__cppa_admt",
        complianceTrigger:
          "Applies if you make significant decisions about California residents — employment, housing, credit, education, healthcare, insurance — using automated decision-making technology, including AI.",
        toolCtaPlacement: "top",
        toolCta: {
          toolName: "CPPA Risk Assessment",
          toolDescription:
            "Generate a CPPA-aligned risk assessment for automated decision-making and high-risk processing.",
          href: "/cppa-risk-assessment",
        },
        content: `<p>Automated decision-making technology (ADMT) is a key area of regulatory focus. <a href="/us-state-privacy-laws">California</a>'s CPPA <a href="https://cppa.ca.gov/regulations/automated_decisionmaking.html" target="_blank" rel="noopener noreferrer">adopted its ADMT regulations in July 2025 (OAL-approved September 23, 2025; effective January 1, 2026)</a>, requiring businesses to provide pre-use notices and opt-out rights for automated decisions in employment, housing, and credit. <a href="https://gdpr-info.eu/art-22-gdpr/" target="_blank" rel="noopener noreferrer">GDPR Article 22</a> provides rights regarding automated individual decision-making, including profiling. The <a href="/regulator/ico">Information Commissioner's Office (ICO)</a>'s <a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/biometric-data-guidance-biometric-recognition/" target="_blank" rel="noopener noreferrer">AI and Biometrics Strategy (June 2025, updated March 2026) prioritizes automated decision-making in recruitment and biometric technologies; its February 2024 workplace biometrics guidance makes clear that biometric recognition generally needs an Article 9 condition — usually explicit consent — plus a DPIA</a>.</p><p style="margin-top:0.75rem"><a href="/cppa-admt-checker" style="color:var(--brand-teal);font-weight:600">Assess your ADMT compliance →</a> Gap analysis for pre-use notices, opt-out mechanisms, and access rights under 11 CCR §§ 7200–7222.</p>`,
      },
      {
        id: "enforcement",
        h2: "Emerging Enforcement",
        synthesisKey: "ai_privacy__enforcement",
        complianceTrigger:
          "Applies to every AI deployer — regulators are using existing GDPR, CCPA, and FTC Act powers against AI systems now, without waiting for AI-specific legislation.",
        toolCtaPlacement: "top",
        toolCta: {
          toolName: "Governance Assessment",
          toolDescription: "Assess your AI governance program against active enforcement patterns from the EDPB, FTC, ICO, and CPPA.",
          href: "/governance-assessment",
        },
        content: `<p>Enforcement at the AI–privacy intersection is accelerating across multiple regulators simultaneously.</p>

<ul>

<li><strong><a href="/regulator/garante">Italian Data Protection Authority (Garante)</a>:</strong> Temporarily banned ChatGPT in 2023; imposed €15M on OpenAI in November 2024 — annulled in full by the Court of Rome on March 18, 2026, on jurisdictional one-stop-shop grounds, leaving the substantive questions undecided. Significant: AI enforcement decisions face serious appellate scrutiny.</li>

<li><strong><a href="/regulator/edpb">EDPB</a>:</strong> Opinion 28/2024 on AI training data guides supervisory authorities across the EEA. Expect coordinated enforcement actions against AI developers without documented legal bases for training data.</li>

<li><strong><a href="/regulator/ftc">Federal Trade Commission (FTC)</a>:</strong> Active enforcement against AI-driven deceptive practices and voice-cloning fraud. The FTC's <em>Section 5 unfairness</em> theory is being extended to AI systems that produce harmful outputs.</li>

<li><strong><a href="/regulator/ico">ICO</a>:</strong> Published AI and data protection guidance in 2024; enforcement focus is on transparency and purpose limitation in AI systems.</li>

<li><strong>CPPA (California):</strong> Adopted ADMT regulations in July 2025 (effective January 1, 2026). First enforcement actions expected H2 2026.</li>

</ul>

<p><strong>Key pattern:</strong> Regulators are not waiting for AI-specific legislation — they are applying existing GDPR, CCPA, and FTC Act frameworks to AI systems right now.</p>`,
      },
      {
        id: "national-ai",
        h2: "National AI Strategies and Privacy",
        synthesisKey: "ai_privacy__national",
        complianceTrigger:
          "Applies if you operate in the UK, Canada, China, Brazil, or Colorado — divergent national AI frameworks now layer on top of general privacy law.",
        content: `<p>Beyond the EU, AI governance frameworks are developing on divergent tracks — ranging from sector-specific guidance to hard legislative obligations.</p>

<ul>

<li><strong><a href="/jurisdiction/united-kingdom">UK:</a></strong> Sector-specific regulation through existing regulators. The <a href="/regulator/ico">ICO</a> has published binding guidance on AI and data protection. No dedicated AI Act equivalent — deliberate policy choice to stay flexible.</li>

<li><strong><a href="/jurisdiction/canada">Canada:</a></strong> <a href="https://ised-isde.canada.ca/site/innovation-better-canada/en/artificial-intelligence-and-data-act" target="_blank" rel="noopener noreferrer">AIDA</a> (Bill C-27) proposed mandatory impact assessments for high-impact AI systems but died on prorogation in January 2025; federal AI legislation awaits reintroduction.</li>

<li><strong><a href="/jurisdiction/china">China:</a></strong> The most active non-EU regulator. The <a href="/regulator/cac">Cyberspace Administration of China (CAC)</a> has issued binding regulations on algorithmic recommendations (2022), deep synthesis (2023), and generative AI (2023) — with active enforcement. China's approach is sovereignty-driven and moves faster than Western equivalents.</li>

<li><strong><a href="/jurisdiction/brazil">Brazil:</a></strong> AI regulation bill PL 2338/2023 includes algorithmic impact assessments. Still advancing through Congress.</li>

<li><strong>Colorado (U.S.):</strong> <a href="https://leg.colorado.gov/bills/sb24-205" target="_blank" rel="noopener noreferrer">SB 24-205</a> (effective 2026) requires impact assessments for consequential AI decisions — the first U.S. state AI Act equivalent.</li>

</ul>

<p><strong>Practical implication:</strong> China and the EU are the only jurisdictions with active AI-specific enforcement right now. The rest are still in guidance or legislative phases.</p>`,
      },
    ])}
    relatedLinks={[
      { label: "Biometric Privacy Guide", href: "/biometric-privacy" },
      { label: "GDPR Enforcement", href: "/gdpr-enforcement" },
      { label: "Cross-Border Transfers Guide", href: "/cross-border-transfers" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
    ]}
    intelligenceUpsellTopic="AI privacy and the EU AI Act"
  />
  </>
);

export default AIPrivacyRegulations;
