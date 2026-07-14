// DPIA Framework — enum option sets extracted into a standalone module so both
// the intake page and shared components (refine surface) can import them
// without a page↔shared-component cycle. Content-anchored: page re-exports
// from here; do not re-declare these literals anywhere.
//
// RC-FLIP-3 — extraction from src/pages/DPIAFramework.tsx to eliminate the
// last shared-component import of the page module.

export const DATA_CATS = ["Contact details", "Employee records", "Customer records", "Health or medical data", "Financial data", "Biometric data", "Children's data", "Location data", "Communications content", "Other"];
export const TOOLS = ["Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein", "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features", "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud"];
export const SAFEGUARDS = ["Encryption at rest", "Encryption in transit", "Access controls", "Data minimisation", "Pseudonymisation", "Staff training", "DPA signed with processor", "Anonymisation", "Contractual restrictions", "None"];
export const JURISDICTIONS = ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)", "Australia", "Singapore", "Other"];
export const LEGAL_BASES = ["Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))", "Legal obligation (Art. 6(1)(c))", "Vital interests (Art. 6(1)(d))", "Public task (Art. 6(1)(e))", "Legitimate interest (Art. 6(1)(f))", "Not yet determined"];
export const ARTICLE_9_CONDITIONS = ["Explicit consent (Art. 9(2)(a))", "Employment, social security & social protection law (Art. 9(2)(b))", "Vital interests — data subject incapable of consent (Art. 9(2)(c))", "Not-for-profit body's legitimate activities (Art. 9(2)(d))", "Data manifestly made public by the data subject (Art. 9(2)(e))", "Establishment, exercise or defence of legal claims (Art. 9(2)(f))", "Substantial public interest — Union/Member State law (Art. 9(2)(g))", "Preventive/occupational medicine, health or social care (Art. 9(2)(h))", "Public interest in public health (Art. 9(2)(i))", "Archiving, research or statistics — Art. 89(1) (Art. 9(2)(j))", "Not yet determined"];

// EDPB template §0.5 — reasons to conduct (condensed: Art. 35(3) + WP248 criteria + beneficial).
export const REASONS_TO_CONDUCT = [
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))",
  "Evaluation or scoring (incl. profiling / prediction)",
  "Automated decision-making with legal or significant effect",
  "Sensitive or highly personal data",
  "Data processed on a large scale",
  "Matching or combining datasets",
  "Data concerning vulnerable subjects",
  "Innovative use of new technology",
  "Processing prevents exercising a right / using a service",
  "Required by national law",
  "DPO or data-subject recommendation",
  "Required by a code of conduct / standard",
  "Risk management / accountability (beneficial)",
  "Existing processing — the risk has changed",
];
