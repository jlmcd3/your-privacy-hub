// LIA use-case classifier — SHARED, deterministic, no model call.
//
// Doc 73 §4 (R2, CEO-ratified 2026-08-25/26): the precedent-class posture
// table keys off this classifier, not off Stage 1's Haiku classification
// call. Reusing the SAME deterministic function `preview-li-assessment`
// already used for the free-preview signal means the whole R2 pipeline is
// code-computed end to end and satisfies the Render-Readiness Law (doc 48
// §II.6) without waiting on PN-L4's `classify_typed` decision table — a
// model's self-reported use-case label is never the gate for what this
// module renders.
//
// EXTRACTED FROM (single-source-of-truth fix, doc 73 §4 R4): this was
// previously duplicated inline in
// supabase/functions/preview-li-assessment/index.ts. That module now
// imports from here; do not re-inline it there.
//
// Matches Stage 1's `use_case_category` enum
// (run-li-assessment/index.ts ~L828) with one addition ("product_improvement",
// carried from the preview module's own pre-existing set) — the two enums
// are allowed to diverge only if a future landing reconciles them
// deliberately; this module is the one to extend either way.
//
// LIA master review (2026-09-15, F03) — NEGATION. "It does not use health
// data, children's data, behavioural tracking, or automated decisions"
// scored "behavioural" and "tracking" for behavioural advertising and
// classified a monthly customer newsletter as behavioural advertising (Weak,
// with a child-directed precedent). A keyword now counts only where it is
// ASSERTED: an occurrence inside a clause that carries a negation cue before
// it ("does not", "no", "without", "excluding", "rules out", …) is recorded
// as negated and does not score. The detailed result names the asserted and
// the negated terms and any tie, so the page can show the customer what was
// detected and let them correct it before anything is rated on it.

// QA batch 2026-09-05 (LIA 01) — "account-takeover prevention using device,
// IP and failed-login logs to protect customers" classified as
// contractual_administration (hits: "account", "customer") because the
// security list had no authentication vocabulary. The security list now
// carries the credential / login / takeover terms, and the two generic
// contractual words ("account", "customer") are excluded when they appear
// inside a security phrase (see SECURITY_PHRASES) so they cannot outvote it.
export const USE_CASE_KEYWORDS: Record<string, string[]> = {
  // DOC 256 (2026-09-11, batch e2e1185b): "outreach" and "email" classed
  // churn-prediction and customer-success work as direct marketing, and the
  // Recital 47 direct-marketing recognition then led the purpose test. The
  // class now needs a marketing word the record itself uses.
  direct_marketing: ["marketing", "promotional", "newsletter", "campaign", "advertising", "upsell", "cross-sell"],
  fraud_prevention: ["fraud", "abuse", "risk scor", "anti-money", "aml", "kyc", "scam", "chargeback"],
  employee_monitoring: ["employee", "worker", "workplace", "staff", "monitor"],
  behavioral_advertising: ["behavioural", "behavioral", "advertis", "targeting", "tracking", "profiling for ads"],
  research_analytics: ["research", "analytics", "statistics", "insights", "measurement"],
  it_security: [
    "security", "intrusion", "logging", "audit", "network", "cyber",
    "takeover", "account takeover", "account-takeover", "credential", "login", "log-in", "authentication",
    "unauthori", "brute force", "brute-force", "malicious", "threat", "breach", "phishing", "bot ",
  ],
  contractual_administration: ["account", "billing", "service delivery", "support", "customer"],
  product_improvement: ["improve", "develop", "feature", "personalis", "personaliz", "recommend"],
};

/** Security phrases whose generic words must not score for contractual_administration. */
const SECURITY_PHRASES = [
  /account[\s-]*takeover/g,
  /account[\s-]*(?:compromise|hijack|security|protection|abuse)/g,
  /(?:protect|secur|safeguard)\w*\s+(?:our\s+|the\s+)?customers?/g,
  /customers?['’]?\s+accounts?\s+(?:from|against)/g,
];

export const USE_CASE_LABELS: Record<string, string> = {
  direct_marketing: "Direct marketing",
  fraud_prevention: "Fraud prevention",
  employee_monitoring: "Employee monitoring",
  behavioral_advertising: "Behavioural advertising",
  research_analytics: "Research & analytics",
  it_security: "IT security",
  contractual_administration: "Contractual administration",
  product_improvement: "Product improvement",
  other: "General processing",
};

export type LiaUseCaseClass = keyof typeof USE_CASE_KEYWORDS | "other";

export const USE_CASE_CODES: readonly LiaUseCaseClass[] = [
  ...(Object.keys(USE_CASE_KEYWORDS) as LiaUseCaseClass[]),
  "other",
];

export function isLiaUseCaseClass(v: unknown): v is LiaUseCaseClass {
  return typeof v === "string" && (USE_CASE_CODES as readonly string[]).includes(v);
}

/**
 * Clause boundaries. A clause is the unit inside which a negation cue
 * governs the words that follow it. Sentence punctuation, line breaks and
 * the contrastive connectors "but" / "however" / "whereas" start a new
 * clause, so "we do not track people, but we do send a newsletter" negates
 * "track" and asserts "newsletter".
 */
const CLAUSE_BOUNDARY = /[.;!?\n]|,?\s+(?:but|however|whereas|although|while)\s+/gi;

/**
 * Negation cues. A keyword occurring AFTER one of these inside the same
 * clause is negated. "no" and "not" are matched as whole words so "note",
 * "notice" and "know" do not trigger.
 */
const NEGATION_CUE =
  /\b(?:do(?:es)?\s+not|don['’]t|doesn['’]t|did\s+not|didn['’]t|is\s+not|isn['’]t|are\s+not|aren['’]t|was\s+not|wasn['’]t|will\s+not|won['’]t|cannot|can['’]t|never|no|not|none|nor|without|exclud(?:e|es|ed|ing)|except(?:ing)?|rules?\s+out|ruled\s+out|other\s+than|free\s+of|absence\s+of|instead\s+of|rather\s+than|refrain(?:s|ed)?\s+from|prohibit(?:s|ed)?)\b/gi;

interface Clause { text: string; start: number; }

function splitClauses(text: string): Clause[] {
  const out: Clause[] = [];
  let last = 0;
  for (const m of text.matchAll(CLAUSE_BOUNDARY)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: text.slice(last, idx), start: last });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), start: last });
  return out;
}

/** Positions (within the clause) of every negation cue. */
function cuePositions(clause: string): number[] {
  return [...clause.matchAll(NEGATION_CUE)].map((m) => m.index ?? 0);
}

/**
 * Does `keyword` occur ASSERTED (not negated) anywhere in `text`? Returns
 * how many occurrences were asserted and how many negated.
 */
function occurrences(text: string, clauses: Clause[], keyword: string): { asserted: number; negated: number } {
  let asserted = 0;
  let negated = 0;
  for (const clause of clauses) {
    const cues = cuePositions(clause.text);
    let from = 0;
    for (;;) {
      const at = clause.text.indexOf(keyword, from);
      if (at === -1) break;
      const negatedHere = cues.some((c) => c < at);
      if (negatedHere) negated++; else asserted++;
      from = at + Math.max(1, keyword.length);
    }
  }
  void text;
  return { asserted, negated };
}

export interface LiaUseCaseClassification {
  /** The class the preview and the paid engine use. */
  readonly code: LiaUseCaseClass;
  readonly label: string;
  /** Per class: the number of keywords with at least one asserted occurrence. */
  readonly scores: Readonly<Record<string, number>>;
  /** Per class: the keywords that counted (asserted at least once). */
  readonly matched: Readonly<Record<string, readonly string[]>>;
  /** Per class: keywords found ONLY inside negated clauses (did not count). */
  readonly negated: Readonly<Record<string, readonly string[]>>;
  /** True when more than one class shares the top score. */
  readonly tie: boolean;
  /** The classes sharing the top score, in table order (first is `code`). */
  readonly candidates: readonly LiaUseCaseClass[];
}

/**
 * Deterministic keyword classification of a processing_description with
 * the evidence behind it. Pure, no I/O.
 */
export function classifyLiaUseCaseDetailed(description: string): LiaUseCaseClassification {
  const text = (description ?? "").toLowerCase();
  // Text with security phrases masked — the contractual list scores on this
  // so "account" in "account-takeover" or "customer" in "protect customers"
  // counts for security, not for contract administration.
  const contractualText = SECURITY_PHRASES.reduce((t, re) => t.replace(re, " "), text);
  const clauses = splitClauses(text);
  const contractualClauses = splitClauses(contractualText);

  const scores: Record<string, number> = {};
  const matched: Record<string, string[]> = {};
  const negated: Record<string, string[]> = {};
  let bestScore = 0;
  for (const [code, keywords] of Object.entries(USE_CASE_KEYWORDS)) {
    const isContractual = code === "contractual_administration";
    const hay = isContractual ? contractualText : text;
    const cls = isContractual ? contractualClauses : clauses;
    const hit: string[] = [];
    const neg: string[] = [];
    for (const kw of keywords) {
      const occ = occurrences(hay, cls, kw);
      if (occ.asserted > 0) hit.push(kw);
      else if (occ.negated > 0) neg.push(kw);
    }
    scores[code] = hit.length;
    matched[code] = hit;
    negated[code] = neg;
    if (hit.length > bestScore) bestScore = hit.length;
  }
  const candidates = bestScore === 0
    ? []
    : (Object.keys(USE_CASE_KEYWORDS) as LiaUseCaseClass[]).filter((c) => scores[c] === bestScore);
  const code: LiaUseCaseClass = candidates[0] ?? "other";
  return {
    code,
    label: USE_CASE_LABELS[code] ?? USE_CASE_LABELS.other,
    scores,
    matched,
    negated,
    tie: candidates.length > 1,
    candidates,
  };
}

/** Deterministic keyword classification of a processing_description. Pure,
 * no I/O. The same function backs the free preview and the paid report's
 * precedent-class posture finding — one classifier, both surfaces. */
export function classifyLiaUseCase(description: string): LiaUseCaseClass {
  return classifyLiaUseCaseDetailed(description).code;
}

/**
 * LIA master review (2026-09-15, F03) — THE use case the engine reasons on.
 * At screening the customer sees the detected class with its evidence and
 * may confirm a different class; the intake carries it as
 * `use_case_code_confirmed`. A valid confirmed code wins over a fresh keyword
 * classification, so the paid report and the preview agree and the
 * customer's factual correction is honoured. Anything else falls back to the
 * classifier over the description. Pure.
 */
export function resolveLiaUseCase(intake: unknown): LiaUseCaseClass {
  const rec = intake && typeof intake === "object" ? (intake as Record<string, unknown>) : {};
  const confirmed = rec.use_case_code_confirmed;
  if (isLiaUseCaseClass(confirmed)) return confirmed;
  const description = typeof rec.processing_description === "string" ? rec.processing_description : "";
  return classifyLiaUseCase(description);
}

/** True when the record carries a customer-confirmed use case that the engine used. */
export function liaUseCaseWasConfirmed(intake: unknown): boolean {
  const rec = intake && typeof intake === "object" ? (intake as Record<string, unknown>) : {};
  return isLiaUseCaseClass(rec.use_case_code_confirmed);
}
