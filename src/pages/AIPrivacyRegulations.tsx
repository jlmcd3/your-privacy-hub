import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";

const AIPrivacyRegulations = () => (
  <ResearchPageLayout
    metaTitle="AI Privacy Regulations — EU AI Act, GDPR, ADMT | End User Privacy"
    metaDescription="Global overview of AI-specific privacy regulation: the EU AI Act, GDPR and AI training, national AI strategies, automated decision-making, and emerging enforcement."
    header={{
      eyebrow: "Research · AI & Privacy",
      title: "AI Privacy Regulations",
      description:
        "AI regulation is moving faster than any other area of privacy law. The EDPB's March 2026 binding guidance on AI training data is a live compliance obligation. The EU AI Act's high-risk provisions are phasing in through 2027. California's ADMT rules are finalized. This reference covers the frameworks, the enforcement, and what each means for your compliance program.",
      lastUpdated: "March 9, 2026",
      feedCategory: "ai-privacy",
      stats: [
        { value: "Aug 2024", label: "EU AI Act in force" },
        { value: "Art. 22", label: "GDPR right against ADM" },
        { value: "Mar 2026", label: "EDPB AI training guidance" },
        { value: "Mar 2026", label: "CPPA ADMT rules finalized" },
      ],
    }}
    pageSynthesisKey="ai_privacy__page"
    topToolCta={{
      toolName: "Governance Assessment",
      toolDescription:
        "Assess your AI governance program against the EU AI Act, GDPR Article 22, and CPPA ADMT enforcement patterns.",
      href: "/governance-assessment",
    }}
    sections={[
      {
        id: "eu-ai-act",
        h2: "The EU AI Act",
        synthesisKey: "ai_privacy__eu_ai_act",
        content: `<p>The <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" target="_blank" rel="noopener noreferrer">EU AI Act</a>, which entered into force in August 2024 with phased implementation through 2027, establishes the world's first comprehensive regulatory framework specifically for artificial intelligence. The Act classifies AI systems by risk level — unacceptable, high-risk, limited, and minimal — and imposes corresponding obligations. <a href="https://artificialintelligenceact.eu/annex/3/" target="_blank" rel="noopener noreferrer">High-risk AI systems</a> used in areas like employment, credit scoring, and law enforcement face requirements for conformity assessments, risk management systems, data governance, transparency, human oversight, and accuracy monitoring. The Act's interaction with the <a href="https://gdpr-info.eu/" target="_blank" rel="noopener noreferrer">GDPR</a> creates a dual compliance requirement for AI systems processing personal data.</p>`,
        toolCta: {
          toolName: "Data Protection Impact Assessment",
          toolDescription: "High-risk AI systems under the EU AI Act and GDPR Article 35 require a DPIA. Generate one structured to EDPB WP 248 requirements.",
          href: "/dpia-framework",
        },
      },
      {
        id: "gdpr-ai-training",
        h2: "GDPR and AI Training Data",
        synthesisKey: "ai_privacy__gdpr_ai",
        content: `<p>The <a href="/regulator/edpb">EDPB</a>'s <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-data-protection-aspects_en" target="_blank" rel="noopener noreferrer">March 2026 binding guidance</a> on personal data use in AI model training represents the most significant regulatory development at the AI–privacy intersection. The guidance establishes that training large language models on scraped personal data without a valid legal basis constitutes a GDPR violation. Controllers must identify a legal basis under <a href="https://gdpr-info.eu/art-6-gdpr/" target="_blank" rel="noopener noreferrer">Article 6</a> for each distinct phase of AI development: data collection, pre-processing, and model training. Legitimate interest cannot be automatically assumed; controllers must conduct and document a balancing test for each use case.</p>`,
        toolCta: {
          toolName: "Legitimate Interest Assessment",
          toolDescription: "The EDPB's March 2026 guidance requires a documented balancing test for each AI training use case. Generate a structured LIA aligned to EDPB guidance.",
          href: "/lia-assessment",
        },
      },
      {
        id: "national-ai",
        h2: "National AI Strategies and Privacy",
        synthesisKey: "ai_privacy__national",
        content: `<p>Beyond the EU, numerous jurisdictions are developing AI governance frameworks with privacy components. The <a href="/jurisdiction/united-kingdom">UK</a>'s approach emphasizes sector-specific regulation through existing regulators, with the <a href="/regulator/ico">ICO</a> publishing <a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/" target="_blank" rel="noopener noreferrer">updated guidance on AI and data protection</a>. <a href="/jurisdiction/canada">Canada</a>'s <a href="https://ised-isde.canada.ca/site/innovation-better-canada/en/artificial-intelligence-and-data-act" target="_blank" rel="noopener noreferrer">AIDA</a> proposes AI-specific obligations alongside amendments to <a href="https://laws-lois.justice.gc.ca/ENG/ACTS/P-8.6/index.html" target="_blank" rel="noopener noreferrer">PIPEDA</a>. <a href="/jurisdiction/brazil">Brazil</a>'s <a href="https://www25.senado.leg.br/web/atividade/materias/-/materia/157233" target="_blank" rel="noopener noreferrer">AI regulation bill (PL 2338/2023)</a> includes provisions for algorithmic impact assessments. <a href="/jurisdiction/china">China</a> — through the <a href="/regulator/cac">CAC</a> — has implemented a series of AI-specific regulations covering <a href="http://www.cac.gov.cn/2022-03/01/c_1647874097948255.htm" target="_blank" rel="noopener noreferrer">algorithmic recommendations</a>, <a href="http://www.cac.gov.cn/2022-12/11/c_1672221949354811.htm" target="_blank" rel="noopener noreferrer">deep synthesis</a>, and <a href="http://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm" target="_blank" rel="noopener noreferrer">generative AI</a>.</p>`,
      },
      {
        id: "admt",
        h2: "Automated Decision-Making",
        synthesisKey: "ai_privacy__cppa_admt",
        content: `<p>Automated decision-making technology (ADMT) is a key area of regulatory focus. <a href="/us-state-privacy-laws">California</a>'s CPPA <a href="https://cppa.ca.gov/regulations/automated_decisionmaking.html" target="_blank" rel="noopener noreferrer">finalized ADMT regulations</a> in March 2026, requiring businesses to provide pre-use notices and opt-out rights for automated decisions in employment, housing, and credit. <a href="https://gdpr-info.eu/art-22-gdpr/" target="_blank" rel="noopener noreferrer">GDPR Article 22</a> provides rights regarding automated individual decision-making, including profiling. The <a href="/regulator/ico">ICO</a>'s <a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/biometric-data-guidance-biometric-recognition/" target="_blank" rel="noopener noreferrer">March 2026 guidance on biometric data in workplace AI systems</a> clarifies that biometric processing by AI requires explicit consent and DPIAs.</p>`,
        toolCta: {
          toolName: "CPPA Risk Assessment",
          toolDescription:
            "Generate a CPPA-aligned risk assessment for automated decision-making and high-risk processing.",
          href: "/cppa-risk-assessment",
        },
      },
      {
        id: "enforcement",
        h2: "Emerging Enforcement",
        synthesisKey: "ai_privacy__enforcement",
        content: `<p>Enforcement at the AI–privacy intersection is accelerating across multiple regulators simultaneously.</p>

<ul>

<li><strong><a href="/regulator/garante">Garante (Italy)</a>:</strong> Temporarily banned ChatGPT in 2023; imposed €15M on OpenAI in November 2024 — overturned by the Court of Rome in March 2026. Significant for establishing that AI enforcement decisions face serious appellate scrutiny.</li>

<li><strong><a href="/regulator/edpb">EDPB:</a></strong> March 2026 binding guidance on AI training data is enforceable across all 27 EU DPAs. Expect coordinated enforcement actions against AI developers without documented legal bases for training data.</li>

<li><strong><a href="/regulator/ftc">FTC (U.S.):</a></strong> Active enforcement against AI-driven deceptive practices and voice-cloning fraud. The FTC's <em>Section 5 unfairness</em> theory is being extended to AI systems that produce harmful outputs.</li>

<li><strong><a href="/regulator/ico">ICO (UK):</a></strong> Published AI and data protection guidance in 2024; enforcement focus is on transparency and purpose limitation in AI systems.</li>

<li><strong>CPPA (California):</strong> Finalized ADMT regulations in March 2026. First enforcement actions expected H2 2026.</li>

</ul>

<p><strong>Key pattern:</strong> Regulators are not waiting for AI-specific legislation — they are applying existing GDPR, CCPA, and FTC Act frameworks to AI systems right now.</p>`,
        toolCta: {
          toolName: "Governance Assessment",
          toolDescription: "Assess your AI governance program against active enforcement patterns from the EDPB, FTC, ICO, and CPPA.",
          href: "/governance-assessment",
        },
      },
    ]}
    relatedLinks={[
      { label: "GDPR Enforcement", href: "/gdpr-enforcement" },
      { label: "U.S. Privacy Laws", href: "/us-privacy-laws" },
      { label: "Global Privacy Laws", href: "/global-privacy-laws" },
      { label: "Enforcement Tracker", href: "/enforcement-tracker" },
    ]}
    intelligenceUpsellTopic="AI privacy and the EU AI Act"
  />
);

export default AIPrivacyRegulations;
