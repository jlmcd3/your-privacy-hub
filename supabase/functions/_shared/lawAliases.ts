// Shared law alias list for edge functions (mirrors src/data/lawRegistry.ts).
// Keep this in sync when adding laws to the registry.
export interface LawAlias {
  slug: string;        // canonical law_slug used in regulatory_milestones.law_slug
  patterns: string[];  // lowercase patterns to match against update title/category/summary
}

export const LAW_ALIASES: LawAlias[] = [
  { slug: "Indiana SB 5",         patterns: ["indiana sb 5", "indiana comprehensive privacy", "indiana cdpa"] },
  { slug: "Kentucky HB 15",       patterns: ["kentucky hb 15", "kentucky consumer data protection", "kcdpa"] },
  { slug: "Rhode Island HB 6122", patterns: ["rhode island hb 6122", "rhode island data transparency", "ridtppa"] },
  { slug: "Maryland MODPA",       patterns: ["maryland modpa", "maryland online data privacy", "maryland sb 541"] },
  { slug: "Minnesota HF 2309",    patterns: ["minnesota hf 2309", "minnesota consumer data privacy", "mcdpa"] },
  { slug: "Nebraska LB 1074",     patterns: ["nebraska lb 1074", "nebraska data privacy", "ndpa"] },
  { slug: "CPRA",                 patterns: ["cpra", "california privacy rights act", "ccpa/cpra", "cppa admt", "automated decision-making technology"] },
  { slug: "SB 362",               patterns: ["sb 362", "california delete act", "delete act", "opt me out"] },
  { slug: "Colorado SB 24-205",   patterns: ["colorado sb 24-205", "colorado algorithmic accountability", "colorado ai act"] },
  { slug: "EU AI Act",            patterns: ["eu ai act", "ai act", "artificial intelligence act"] },
  { slug: "GDPR",                 patterns: ["gdpr", "general data protection regulation"] },
  { slug: "LGPD",                 patterns: ["lgpd", "lei geral", "anpd"] },
];

export function detectLawSlug(...fields: (string | null | undefined)[]): string | null {
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return null;
  for (const entry of LAW_ALIASES) {
    for (const p of entry.patterns) {
      if (haystack.includes(p)) return entry.slug;
    }
  }
  return null;
}

// Keywords that suggest a tracked law's date may have shifted.
// Doc 228 §2.4 — the original 15-term list matched zero of the last 30 days'
// 72 updates. Broadened to cover the wording regulators and courts actually use
// when a compliance date, enforcement posture, or rule text moves.
export const DRIFT_KEYWORDS = [
  // timing moves
  "delayed", "delay", "postponed", "postpone", "deferred", "defer",
  "pushed back", "extended deadline", "deadline extended", "extension of time",
  "amended effective date", "new effective date", "effective date change",
  "compliance extension", "compliance date", "grace period",
  "phased in", "phase-in", "transition period", "takes effect", "comes into force",
  "entry into application", "delayed application",
  // court / legal challenge
  "enjoined", "injunction", "preliminary injunction", "blocked by court",
  "struck down", "vacated", "set aside", "annulled", "quashed", "overturned",
  "stayed", "stay of enforcement", "remanded", "appeal upheld", "on appeal",
  // rulemaking / enforcement posture
  "rulemaking delay", "rulemaking paused", "withdrawn", "repealed", "rescinded",
  "suspended", "enforcement pause", "enforcement discretion", "will not enforce",
  "no enforcement until", "moratorium", "reopened consultation", "re-proposed",
  "amended regulation", "signed into law", "enacted",
];

