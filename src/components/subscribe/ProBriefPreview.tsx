import { useState } from "react";

const INDUSTRIES = [
  { value: "healthcare",  label: "Healthcare & Life Sciences" },
  { value: "adtech",      label: "AdTech & Digital Media" },
  { value: "fintech",     label: "Financial Services" },
  { value: "ai",          label: "AI & Technology" },
  { value: "retail",      label: "Retail & E-commerce" },
  { value: "legal",       label: "Law Firm / Legal Services" },
];

const REGIONS = [
  { value: "eu",     label: "EU & UK" },
  { value: "us",     label: "United States" },
  { value: "global", label: "Global / Multinational" },
  { value: "apac",   label: "Asia-Pacific" },
];

const PREVIEW_EXCERPTS: Record<string, Record<string, { headline: string; excerpt: string; action: string }>> = {
  healthcare: {
    eu: {
      headline: "EDPB clinical trial guidance creates new transfer obligations for healthcare processors",
      excerpt: "This week's EDPB opinion on pseudonymization of clinical trial data directly affects your cross-border processing workflows. The guidance tightens Article 9 requirements for health data, meaning existing transfer mechanisms for EU-US patient data sharing may need re-evaluation. Your HIPAA-compliant programs are not automatically GDPR-compliant under the new standard.",
      action: "Review your clinical trial data transfer agreements against the new EDPB pseudonymization standard before Q2 audits.",
    },
    us: {
      headline: "HHS OCR signals enforcement escalation for digital health tracking pixels",
      excerpt: "OCR's latest guidance and the California AG's simultaneous enforcement action against two health systems creates a coordinated federal-state squeeze on third-party tracking in healthcare portals. The combined exposure — HIPAA penalties plus CCPA statutory damages — means organizations using session replay or analytics pixels on patient portals face concurrent multi-regulator liability this quarter.",
      action: "Audit all third-party pixels and tracking scripts on patient-facing portals within 30 days. Both federal and state regulators are actively reviewing.",
    },
    global: {
      headline: "Cross-border health data: Three simultaneous developments create multinational compliance window",
      excerpt: "This week saw coordinated healthcare data enforcement activity across three jurisdictions — the EDPB clinical trial opinion, HHS OCR pixel enforcement, and Singapore PDPC's guidance on medical records retention. Organizations with multinational health data operations face a narrow 60-day window to align policies across all three regimes before enforcement intensifies.",
      action: "Map your health data flows against all three jurisdictions' updated requirements. EDPB and PDPC guidance share 70% overlap — one policy update can cover both.",
    },
    apac: {
      headline: "Singapore PDPC tightens medical records retention rules for cross-border health platforms",
      excerpt: "PDPC's updated advisory on medical records retention creates stricter obligations for telehealth platforms operating in APAC. Combined with Australia's Privacy Act reforms targeting health data, APAC-focused healthcare organizations face a dual compliance challenge requiring updated data retention schedules and cross-border transfer assessments.",
      action: "Review APAC health data retention policies against Singapore PDPC and Australian Privacy Act requirements within 45 days.",
    },
  },
  adtech: {
    eu: {
      headline: "IAB TCF under sustained DPA pressure as Belgian and French regulators act simultaneously",
      excerpt: "The Belgian DPA's follow-up ruling on the IAB's Transparency & Consent Framework, issued alongside CNIL's enforcement against two programmatic platforms, signals a coordinated European push against TCF-reliant consent mechanisms. If your ad stack relies on TCF 2.2 for EU consent signals, this week's actions suggest your legal basis is under active review by at least three DPAs.",
      action: "Legal basis audit required for all EU programmatic inventory by end of Q2. Document your legitimate interest assessments for AdTech use cases now.",
    },
    us: {
      headline: "FTC finalizes commercial surveillance rules — AdTech implications are immediate",
      excerpt: "This week's FTC final rule on commercial surveillance contains specific provisions targeting behavioral advertising data brokers and lookalike audience construction. The rule's definition of 'sensitive data' now explicitly includes inferred demographic data — a category most AdTech platforms generate through audience modeling — triggering opt-in consent requirements before July enforcement.",
      action: "Map all inferred demographic data flows against the FTC's new sensitive data definition. Audiences built from modeled data likely require explicit consent under the new rule.",
    },
    global: {
      headline: "Cookie consent divergence widens: EU, UK, and US now have three incompatible standards",
      excerpt: "CNIL's new cookie guidance, the ICO's revised cookie compliance checker, and California's CPPA technical specifications published within 10 days of each other — and they are not reconcilable without jurisdiction-specific consent flows. Unified consent management is no longer viable for multinational publishers without technical segmentation by user geography.",
      action: "Consent management platforms must implement geography-aware consent flows by July 1. A single consent banner cannot comply with all three regimes simultaneously.",
    },
    apac: {
      headline: "Japan and South Korea align on cross-border ad data restrictions",
      excerpt: "Japan's PPC and South Korea's PIPC issued coordinated guidance on cross-border advertising data transfers this week, creating new consent requirements for programmatic platforms operating across APAC markets. The alignment creates a de facto APAC standard that diverges from both EU and US approaches.",
      action: "Review APAC programmatic ad data flows for compliance with Japan-Korea aligned standards. Separate consent mechanisms may be required.",
    },
  },
  fintech: {
    eu: {
      headline: "DORA implementation reveals GDPR data minimization tension in financial sector AI",
      excerpt: "This week's EBA technical standard under DORA requires financial institutions to maintain detailed AI model documentation that includes training data provenance — creating a direct tension with GDPR data minimization principles. Firms that deleted training data to comply with GDPR retention requirements may now be non-compliant with DORA's model explainability obligations.",
      action: "Map your AI model documentation against both DORA Article 28 requirements and your GDPR deletion schedules. Legal and technology teams must co-own this review.",
    },
    us: {
      headline: "CFPB Section 1033 open banking rule creates new privacy consent architecture",
      excerpt: "The CFPB's final rule on consumer financial data access creates a new consent framework that operates alongside but not within GLBA — meaning financial institutions must now maintain two parallel consent systems for the same data. The rule's 'authorized third party' definition overlaps substantially with CCPA's service provider definition but uses different eligibility criteria.",
      action: "Your privacy notice and consent flows need dual-track redesign: one for GLBA covered data, one for Section 1033 data portability. Deadline is January 2026 for covered institutions.",
    },
    global: {
      headline: "Cross-border financial data: BIS, FSB, and EU diverge on AI risk and privacy",
      excerpt: "Three simultaneous developments from the Bank for International Settlements, the Financial Stability Board, and the EU AI Act implementation team this week produced conflicting guidance on AI explainability for credit decisions. Multinational financial institutions now face genuinely incompatible regulatory expectations across their AI governance frameworks.",
      action: "Your AI governance policy needs jurisdiction-specific annexes. A single global AI policy cannot satisfy BIS, FSB, and EU AI Act requirements simultaneously.",
    },
    apac: {
      headline: "Hong Kong and Singapore fintech regulators tighten AI model governance requirements",
      excerpt: "HKMA and MAS simultaneously released updated AI governance frameworks for financial institutions, requiring explainability documentation and bias testing for credit scoring models. The dual regulatory action creates new compliance obligations for APAC fintech firms operating across both jurisdictions.",
      action: "Review AI model governance documentation against both HKMA and MAS updated frameworks. Cross-jurisdiction compliance mapping is critical for Q3.",
    },
  },
  ai: {
    eu: {
      headline: "EU AI Act prohibited practices enforcement begins: GPAI model providers face first deadlines",
      excerpt: "The EU AI Act's prohibited practices provisions became enforceable this week, and General Purpose AI model providers face their first formal compliance deadline for systemic risk assessments. Three major LLM providers received formal requests from the AI Office for model capability documentation under Article 55 — the first use of the AI Office's investigatory powers.",
      action: "GPAI providers must file systemic risk assessments with the EU AI Office within 30 days of this week's formal requests. Downstream deployers must review provider compliance status.",
    },
    us: {
      headline: "FTC AI guidance targets 'dark patterns' in AI disclosure as NIST AI RMF gains regulatory force",
      excerpt: "The FTC's new policy statement on deceptive AI practices, combined with the NIST AI Risk Management Framework being incorporated by reference into three state AI laws this week, creates a de facto national standard for AI disclosure that is now enforceable. The FTC's 'material AI use' definition is broader than most industry disclosures currently meet.",
      action: "Audit all customer-facing AI disclosures against the FTC's new 'material AI use' standard. The threshold is broader than most legal teams assumed — nearly all chatbot and recommendation system uses must be disclosed.",
    },
    global: {
      headline: "G7 AI Code of Conduct gains teeth as Japan, UK, and Canada move to implement simultaneously",
      excerpt: "This week's coordinated announcement by Japan, UK, and Canada to incorporate the G7 Hiroshima AI Code of Conduct into domestic regulation creates the first substantive multinational AI governance framework with enforcement implications. Organizations with significant operations in all three jurisdictions now face a 12-month implementation runway before the soft law becomes hard obligations.",
      action: "Map your AI systems against the G7 Code's 11 principles. Japan's implementation timeline is most aggressive — domestic guidance expected within 90 days.",
    },
    apac: {
      headline: "China's AI safety regulations enter enforcement phase with first compliance reviews",
      excerpt: "China's Cyberspace Administration began conducting the first formal compliance reviews under the Generative AI Measures this week, targeting both domestic and foreign-operated AI services accessible to Chinese users. The reviews focus on content safety, data training transparency, and algorithmic recommendation accountability.",
      action: "If your AI services are accessible to users in China, prepare for CAC compliance review. Documentation of training data sources and content safety measures is now mandatory.",
    },
  },
  retail: {
    eu: {
      headline: "DSA content moderation obligations now apply to large online platforms — retail marketplaces included",
      excerpt: "The European Commission confirmed this week that major retail marketplace operators meeting the 'very large online platform' threshold under the DSA must now comply with enhanced transparency and algorithmic accountability requirements — including data access for researchers and detailed explanation obligations for recommendation systems. Most retail operators had been treating DSA as a social media regulation.",
      action: "If your marketplace has >45M EU monthly users, DSA compliance is not optional and enforcement is active. The Commission issued its first formal requests to non-social-media platforms this week.",
    },
    us: {
      headline: "Children's privacy trifecta: COPPA 2.0, state kids' codes, and FTC enforcement converge",
      excerpt: "Three simultaneous developments create maximum children's privacy exposure for retail platforms: COPPA 2.0's Senate passage, California's Age-Appropriate Design Code enforcement escalation, and the FTC's specific warning to e-commerce operators about targeted advertising to under-18 users. Any retail platform with children as a foreseeable user segment faces all three simultaneously.",
      action: "Children's data audit required immediately. The FTC's definition of 'directed to children' in retail contexts is broader than most legal teams assume — covers platforms where children are a reasonably foreseeable user, not just a primary audience.",
    },
    global: {
      headline: "Cross-border e-commerce: EU, UK, US, and China have fundamentally different adequacy frameworks",
      excerpt: "This week's developments in EU-US data flows (post-Schrems II adequacy review), UK's independent adequacy framework divergence, and China's new cross-border data transfer certification requirements collectively mean that a multinational retailer with customer data across all four regions cannot maintain a single data transfer mechanism. Each requires jurisdiction-specific legal instruments.",
      action: "Data transfer mapping is now mandatory for any retailer with customers in all four regions. Standard Contractual Clauses alone are no longer sufficient for China outbound transfers.",
    },
    apac: {
      headline: "India DPDP Act implementation creates new consent requirements for e-commerce platforms",
      excerpt: "India's Digital Personal Data Protection Act implementation rules published this week establish specific consent requirements for e-commerce platforms, including granular purpose limitation for marketing data and new data localization requirements for payment information. Retail platforms with Indian customers face a 6-month compliance window.",
      action: "Map your Indian customer data flows against DPDP Act requirements. Payment data localization and marketing consent requirements are the highest priority items.",
    },
  },
  legal: {
    eu: {
      headline: "Law firm data: GDPR client confidentiality tensions crystallize as DPAs investigate three firms",
      excerpt: "Three European DPAs simultaneously opened investigations into law firm data practices this week — specifically targeting AI-assisted document review tools and the lawfulness of processing client data through third-party AI platforms. The investigations test whether attorney-client privilege provides any cover under GDPR Article 9 for sensitive client information processed by external AI systems.",
      action: "Review all AI-assisted document review and due diligence tools for GDPR lawfulness. Processing client data through cloud-based AI systems requires explicit lawful basis — legal professional privilege is not a GDPR exemption.",
    },
    us: {
      headline: "State bar ethics opinions on AI conflict with emerging privacy regulations — creating dual exposure",
      excerpt: "This week's California State Bar formal opinion on AI use in legal practice creates new confidentiality obligations that in several respects conflict with California's CPRA data minimization requirements. Law firms are now caught between state bar ethics rules requiring data retention for client matters and privacy laws requiring deletion upon client request.",
      action: "Legal ethics counsel and privacy counsel must co-develop a policy addressing the retention-deletion conflict. California firms face the most acute tension — a written policy is now necessary to document the considered legal judgment.",
    },
    global: {
      headline: "International data transfers for litigation support: Three new adequacy gaps emerge",
      excerpt: "UK-EU divergence on Standard Contractual Clauses, China's new requirements for outbound data in cross-border litigation, and India's DPDP Act implementation create three new gaps in the international litigation support workflows most global law firms rely on. eDiscovery involving data from any of these three jurisdictions now requires jurisdiction-specific transfer instruments.",
      action: "Audit your cross-border eDiscovery workflows for UK-EU, China, and India data. The adequacy gaps are real and enforcement is accelerating. Client disclosure may be required where existing transfer mechanisms are invalidated.",
    },
    apac: {
      headline: "APAC law firms face new AI tool compliance requirements across multiple jurisdictions",
      excerpt: "Japan, Singapore, and Australia simultaneously issued guidance on law firm use of AI tools this week, creating overlapping but distinct compliance requirements for legal technology platforms. Firms operating across APAC must now navigate three different frameworks for AI-assisted legal research, document review, and client communication tools.",
      action: "Review AI tool usage policies against Japan, Singapore, and Australian guidance. A unified APAC AI policy for legal practice is possible but requires jurisdiction-specific annexes.",
    },
  },
};

export default function ProBriefPreview() {
  const [industry, setIndustry] = useState("");
  const [region,   setRegion]   = useState("");

  const preview = industry && region
    ? (PREVIEW_EXCERPTS[industry]?.[region] ?? null)
    : null;

  return (
    <div className="bg-card border border-fog rounded-2xl p-6">

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-[12px] font-semibold text-navy mb-1.5 uppercase tracking-wider">
            Your sector
          </label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            className="w-full px-3.5 py-2.5 text-[13px] bg-paper border border-silver rounded-lg text-navy outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
          >
            <option value="">Select your industry…</option>
            {INDUSTRIES.map(i => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-navy mb-1.5 uppercase tracking-wider">
            Primary region
          </label>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="w-full px-3.5 py-2.5 text-[13px] bg-paper border border-silver rounded-lg text-navy outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
          >
            <option value="">Select your region…</option>
            {REGIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview output */}
      {!preview && (
        <div className="bg-fog rounded-xl p-6 text-center">
          <p className="text-slate text-[13px]">
            Select your sector and region above to see what your tailored
            Monday brief would have opened with this week.
          </p>
        </div>
      )}

      {preview && (
        <div className="bg-gradient-to-br from-navy to-steel rounded-xl p-6 text-white">

          {/* Label */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              ⭐ Your Pro Brief — This Week
            </span>
            <span className="text-blue-300/60 text-[10px]">Sample based on this week's actual developments</span>
          </div>

          {/* Headline */}
          <h3 className="font-display font-bold text-white text-[16px] leading-snug mb-3">
            {preview.headline}
          </h3>

          {/* Excerpt */}
          <p className="text-blue-100/80 text-[13px] leading-relaxed mb-4">
            {preview.excerpt}
          </p>

          {/* Action item */}
          <div className="bg-white/10 border border-white/15 rounded-lg px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              🎯 Your action item this week
            </p>
            <p className="text-white/90 text-[13px] leading-relaxed">
              {preview.action}
            </p>
          </div>

          {/* Conversion CTA */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <p className="text-blue-200 text-[12px]">
              This is what your brief looks like every Monday at 7am.
            </p>
            <a
              href="#pro-plan-card"
              className="text-[12px] font-bold text-navy bg-white hover:opacity-90 transition-all px-4 py-1.5 rounded-lg no-underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("pro-plan-card")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Get Premium →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
