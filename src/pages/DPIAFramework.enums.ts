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
export const LEGAL_BASES = ["Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))", "Legal obligation (Art. 6(1)(c))", "Vital interests (Art. 6(1)(d))", "Public task (Art. 6(1)(e))", "Legitimate interest (Art. 6(1)(f))"];
export const ARTICLE_9_CONDITIONS = ["Explicit consent (Art. 9(2)(a))", "Employment, social security & social protection law (Art. 9(2)(b))", "Vital interests — data subject incapable of consent (Art. 9(2)(c))", "Not-for-profit body's legitimate activities (Art. 9(2)(d))", "Data manifestly made public by the data subject (Art. 9(2)(e))", "Establishment, exercise or defence of legal claims (Art. 9(2)(f))", "Substantial public interest — Union/Member State law (Art. 9(2)(g))", "Preventive/occupational medicine, health or social care (Art. 9(2)(h))", "Public interest in public health (Art. 9(2)(i))", "Archiving, research or statistics — Art. 89(1) (Art. 9(2)(j))", "Not applicable — the biometric data is not used to uniquely identify individuals", "Not yet established — condition still to be identified"];
// DPIA master review (2026-09-15, F10) — "None" clears the other safeguards and is cleared by one.
export const SAFEGUARDS_EXCLUSIVE = ["None"];

// DOC 160 (2026-09-03) — the DOC 131 imagery-capture typed facts, mirrored
// byte-for-byte from the contract (DPIA_IMAGERY_CAPTURE / DPIA_IMAGERY_SPACES).
export const IMAGERY_CAPTURE = [
  "No imagery or video of identifiable individuals",
  "Imagery or video in which identifiable individuals are the subjects",
  "Imagery or video in which identifiable individuals appear incidentally",
];
export const IMAGERY_SPACES = ["Publicly accessible spaces", "Private or controlled premises", "Both"];

// DOC 259A §5.1 (2026-09-11) — shown when a selected reason to conduct is an
// evaluation/scoring, automated-decision-making, or systematic-extensive-
// evaluation reason. Mirrored byte-for-byte from the contract
// (DPIA_AUTOMATED_DECISION_NATURE).
export const AUTOMATED_DECISION_NATURE = [
  "Solely automated — no person with authority to change the outcome reviews the decision before it takes effect",
  "Automated processing with meaningful human review — a person with authority to change the outcome reviews each decision before it takes effect",
  "No decisions with legal or similarly significant effects are taken on the basis of this processing",
];

// DPIA master review (2026-09-15) — mirrored byte-for-byte from the contract
// (DPIA_BIOMETRIC_UNIQUE_ID / DPIA_TRANSFER_PRESENCE /
// DPIA_PROCESSING_END_STATUS / DPIA_ALTERNATIVE_OUTCOMES).
export const BIOMETRIC_UNIQUE_ID = [
  "Yes — used to uniquely identify individuals",
  "No — not used to uniquely identify individuals",
  "Not sure",
];
export const TRANSFER_PRESENCE = [
  "Yes — data leaves the EEA or the UK",
  "No — all processing stays within the EEA and the UK",
  "Not yet assessed",
];
export const PROCESSING_END_STATUS = [
  "Ongoing — no planned end",
  "Temporary — ends on the date or condition below",
  "Not yet decided",
];
export const ALTERNATIVE_OUTCOMES = [
  "Rejected — it would not achieve the purpose",
  "Rejected — other reason (explained)",
  "Viable — still under consideration",
  "Adopted in part",
];
/** The regulator-routing categories the jurisdiction resolver reads (F06); industry is a separate free-text answer. */
export const CONTROLLER_SECTOR_OPTS: Array<{ value: "private" | "public" | "federal-public" | "telecom" | "postal"; label: string }> = [
  { value: "private", label: "A private company" },
  { value: "public", label: "A public body (state or regional)" },
  { value: "federal-public", label: "A national government body" },
  { value: "telecom", label: "A telecoms provider" },
  { value: "postal", label: "A postal provider" },
];

// EDPB template §0.5 — reasons to conduct (condensed: Art. 35(3) + WP248 criteria + beneficial).
export const REASONS_TO_CONDUCT = [
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))",
  "Evaluation or scoring (incl. profiling / prediction)",
  "Automated decision-making with legal or significant effect",
  "Systematic monitoring (of employees, a defined population, or a non-public space)",
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
