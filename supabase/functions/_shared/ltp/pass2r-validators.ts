/**
 * ITEM 278 — PASS-2R VALIDATORS (SPEC §2R.3).
 *
 * The seven deterministic post-render validators of the no-new-facts
 * contract. Pure functions; no I/O; never throw.
 *
 * LIFECYCLE — OBSERVE-FIRST (§2R.3, SPEC §6 quoted at
 * docs/pipeline-state.md:6309). Every validator here ships in "observe"
 * mode by default, mirroring the grounded-note.ts observe/enforce pattern
 * (ltp/grounded-note.ts:476-531). In observe mode the validators produce
 * FULL telemetry and have ZERO effect on the shipped output — the
 * deterministic Pass-2 document is what ships. Promotion to "enforce"
 * requires the §2R.7 acceptance bar and is not enabled by this turn.
 */
import type { RenderPlan } from "../render-plan/schema.ts";
import { hasNameBigram, sanitizeRoleTitleSegments } from "./section-composers/cppa-risk.ts";

export const PASS2R_VALIDATORS_VERSION = "ltp-pass2r-validators-2026-07-30-item278";

/** Mirrors GroundedNoteMode (ltp/grounded-note.ts) — observe is the default. */
export type Pass2rValidatorMode = "observe" | "enforce";
export const PASS2R_DEFAULT_MODE: Pass2rValidatorMode = "observe";

export const PASS2R_VALIDATOR_IDS = [
  "citation_whitelist",
  "numeric_date_whitelist",
  "entity_whitelist",
  "verdict_consistency",
  "section_structure",
  "atomic_token",
  "no_self_contradiction",
] as const;
export type Pass2rValidatorId = typeof PASS2R_VALIDATOR_IDS[number];

// ---------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------

export interface Pass2rPart {
  readonly part: 1 | 2 | 3 | 4;
  readonly heading: string;
  readonly prose: string;
  readonly covered_keys: readonly string[];
}

export interface Pass2rProseDocument {
  readonly parts: readonly Pass2rPart[];
}

export interface Pass2rWhitelist {
  /** Pinpoint strings carried by the locked plan (plan.citation_bindings). */
  readonly citations: readonly string[];
  /** Numeric/date literal strings the plan (or the pinned deadline registry) carries. */
  readonly numerics: readonly string[];
  /** Entity / product / vendor / role strings carried by the plan. */
  readonly entities: readonly string[];
  /** The upstream-computed verdict (INPUT to 2R, §2R.4). */
  readonly verdict: string;
  /** Every other verdict literal in the enum — used for contradiction detection. */
  readonly verdict_alternatives: readonly string[];
  /** True when the plan marks the outcome close/hedged. */
  readonly close_outcome: boolean;
  /** Registry keys that carry deterministic content and must be covered. */
  readonly registry_keys: readonly string[];
  /** Non-empty ledger displays — used by the no-self-contradiction rule. */
  readonly stated_facts: readonly string[];
}

export interface Pass2rRejection {
  readonly validator: Pass2rValidatorId;
  readonly code: string;
  readonly detail: string;
  readonly evidence: readonly string[];
}

export interface Pass2rValidatorOutcome {
  readonly validator: Pass2rValidatorId;
  readonly passed: boolean;
  readonly rejections: readonly Pass2rRejection[];
}

export interface Pass2rValidationResult {
  readonly version: string;
  readonly mode: Pass2rValidatorMode;
  /** True when no validator rejected. */
  readonly ok: boolean;
  /**
   * Whether this result is permitted to affect the shipped document.
   * FALSE in observe mode, always — telemetry only (§2R.3 lifecycle law).
   */
  readonly effective: boolean;
  readonly outcomes: readonly Pass2rValidatorOutcome[];
  readonly rejections: readonly Pass2rRejection[];
  /** Structured reject reason, fed back VERBATIM on retry (§2R.6). */
  readonly reject_reason: string;
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

const MAX_EVIDENCE = 5;

function rej(
  validator: Pass2rValidatorId,
  code: string,
  detail: string,
  evidence: readonly string[],
): Pass2rRejection {
  return { validator, code, detail, evidence: evidence.slice(0, MAX_EVIDENCE) };
}

function outcome(
  validator: Pass2rValidatorId,
  rejections: readonly Pass2rRejection[],
): Pass2rValidatorOutcome {
  return { validator, passed: rejections.length === 0, rejections };
}

export function proseOf(doc: Pass2rProseDocument): string {
  return doc.parts.map((p) => p.prose).join("\n\n");
}

function norm(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Citation-shaped spans: "§ 7152(a)(5)", "§§ 7150–7157", "Art. 6(1)(f)", "Sec. 1798.100". */
const CITATION_RE = /(?:§{1,2}\s*[\d][\dA-Za-z.()\u2013\u2014\-]*|\bArt\.\s*[\d][\dA-Za-z.()\-]*|\bSec\.\s*[\d][\dA-Za-z.()\-]*)/g;

/** Date shapes and bare numbers (used after citation spans are masked out). */
const NUMERIC_RE = /\b\d[\d,]*(?:\.\d+)?%?\b/g;
const DATE_WORD_RE =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g;

/** Number words the register permits without a plan anchor (small-count prose). */
const ALLOWED_NUMBER_WORDS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
]);
void ALLOWED_NUMBER_WORDS;

function maskCitations(text: string): string {
  return text.replace(CITATION_RE, (m) => " ".repeat(m.length));
}

/** Common / structural capitalized words that are never "new entities". */
const ENTITY_STOPWORDS = new Set(
  (
    "The A An And Or But If Then This That These Those There Here It Its We Our You Your They Their " +
    "Part One Two Three Four Company Business Consumer Consumers Assessment Risk Privacy Personal Information " +
    "California Californians Act CCPA CPRA CPPA ADMT DPIA LIA GDPR CCR Code Regulations Regulation Section Sections " +
    "January February March April May June July August September October November December " +
    "Monday Tuesday Wednesday Thursday Friday Saturday Sunday " +
    "Agency Board Attorney General Counsel Company's Where When While Because However Nothing No Not Yes " +
    "Under Per As At By For From In On Of To With Without Whether Each Every Any All Both Neither Either " +
    "Article Articles Chapter Title Appendix Exhibit Schedule Step Steps Next Missing Conclusion Analysis Overview " +
    "Required Result Record Records Data Processing Activity Activities Purpose Purposes Safeguard Safeguards " +
    "Benefit Benefits Impact Impacts Owner Role Roles Officer Director Manager Lead Chief President Vice Deputy " +
    "Head Senior Junior Associate Specialist Architect Engineer Analyst Administrator Executive Security Compliance " +
    "Cybersecurity Audit Audits Notice Notices Report Reports Document Documents Advice Law Legal"
  ).split(/\s+/),
);

/** Candidate proper nouns: capitalized runs that are not sentence-initial. */
function properNounCandidates(text: string): string[] {
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  for (const sentence of sentences) {
    const tokens = sentence.trim().split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      const bare = tokens[i].replace(/^[^\w§]+|[^\w.]+$/g, "");
      if (!bare) continue;
      if (i === 0) continue; // sentence-initial capitalization is not evidence
      if (!/^[A-Z][A-Za-z0-9'&.\-]*$/.test(bare)) continue;
      if (ENTITY_STOPWORDS.has(bare)) continue;
      if (/^[A-Z]{2,6}$/.test(bare)) continue; // acronyms handled by the register rule
      out.push(bare);
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// (1) CITATION WHITELIST
// ---------------------------------------------------------------------

export function validateCitationWhitelist(
  doc: Pass2rProseDocument,
  wl: Pass2rWhitelist,
): Pass2rValidatorOutcome {
  const allowed = wl.citations.map(norm);
  const bad: string[] = [];
  for (const m of norm(proseOf(doc)).match(CITATION_RE) ?? []) {
    const cite = norm(m);
    const ok = allowed.some((a) => a === cite || a.includes(cite) || cite.includes(a));
    if (!ok && !bad.includes(cite)) bad.push(cite);
  }
  return outcome(
    "citation_whitelist",
    bad.length === 0 ? [] : [rej(
      "citation_whitelist",
      "citation_not_plan_carried",
      `${bad.length} citation span(s) are not carried by the locked plan. Cite only the plan's pinpoints, written exactly as the plan writes them.`,
      bad,
    )],
  );
}

// ---------------------------------------------------------------------
// (2) NUMERIC / DATE WHITELIST
// ---------------------------------------------------------------------

export function validateNumericDateWhitelist(
  doc: Pass2rProseDocument,
  wl: Pass2rWhitelist,
): Pass2rValidatorOutcome {
  const haystack = wl.numerics.map(norm).join(" | ");
  const text = maskCitations(norm(proseOf(doc)));
  const bad: string[] = [];

  for (const d of text.match(DATE_WORD_RE) ?? []) {
    if (!haystack.includes(norm(d)) && !bad.includes(d)) bad.push(d);
  }
  for (const n of text.match(NUMERIC_RE) ?? []) {
    if (haystack.includes(n)) continue;
    if (haystack.includes(n.replace(/,/g, ""))) continue;
    if (!bad.includes(n)) bad.push(n);
  }

  return outcome(
    "numeric_date_whitelist",
    bad.length === 0 ? [] : [rej(
      "numeric_date_whitelist",
      "number_or_date_not_in_plan",
      `${bad.length} number(s)/date(s) do not appear in the locked plan, the factor rows, or the pinned deadline literals. Do not compute or introduce values.`,
      bad,
    )],
  );
}

// ---------------------------------------------------------------------
// (3) ENTITY WHITELIST (+ ITEM-273 OWNER-SLOT PII RULE)
// ---------------------------------------------------------------------

export function validateEntityWhitelist(
  doc: Pass2rProseDocument,
  wl: Pass2rWhitelist,
): Pass2rValidatorOutcome {
  const haystack = norm(wl.entities.join(" | "));
  const rejections: Pass2rRejection[] = [];

  const unknown: string[] = [];
  for (const cand of properNounCandidates(norm(proseOf(doc)))) {
    if (haystack.includes(cand)) continue;
    if (!unknown.includes(cand)) unknown.push(cand);
  }
  if (unknown.length > 0) {
    rejections.push(rej(
      "entity_whitelist",
      "entity_not_in_plan",
      `${unknown.length} proper name(s) are not carried by the locked plan. Name only entities, products, vendors and role titles the plan carries.`,
      unknown,
    ));
  }

  // ITEM-273 OWNER-SLOT PII RULE, restated as a prose obligation.
  const pii: string[] = [];
  const ownerRe = /Owner:\s*([^\n.;]*)/g;
  const proseText = proseOf(doc);
  let m: RegExpExecArray | null;
  while ((m = ownerRe.exec(proseText)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    if (hasNameBigram(raw) || sanitizeRoleTitleSegments(raw).length === 0) {
      if (!pii.includes(raw)) pii.push(raw);
    }
  }
  if (pii.length > 0) {
    rejections.push(rej(
      "entity_whitelist",
      "owner_slot_pii",
      "An owner slot names a natural person or is not a role title. Owners are ROLE TITLES only (Item 273).",
      pii,
    ));
  }

  return outcome("entity_whitelist", rejections);
}

// ---------------------------------------------------------------------
// (4) VERDICT CONSISTENCY (§2R.4)
// ---------------------------------------------------------------------

/** Count-driven reasoning shapes banned for firm negatives (§2R.4(3)). */
const COUNT_DRIVEN_RE =
  /\b(?:more|greater number of|majority of|most of the|outnumber(?:s|ed)?|count(?:ed|ing)? of)\b[^.]{0,80}\b(?:factors?|risks?|impacts?|categories)\b/i;

const COUNTERVAILING_RE =
  /\b(?:countervailing|nevertheless|even so|although|notwithstanding|on the other side|weighed against|cuts? the other way|in the Company's favour|in the Company's favor)\b/i;

export function validateVerdictConsistency(
  doc: Pass2rProseDocument,
  wl: Pass2rWhitelist,
): Pass2rValidatorOutcome {
  const rejections: Pass2rRejection[] = [];
  const part4 = doc.parts.find((p) => p.part === 4)?.prose ?? "";
  const conclusion = norm(part4).toLowerCase();
  const verdict = norm(wl.verdict).toLowerCase();

  if (verdict && !conclusion.includes(verdict)) {
    rejections.push(rej(
      "verdict_consistency",
      "verdict_not_stated",
      `Part 4 must state the plan's verdict in the plan's terms: "${wl.verdict}". The verdict is an INPUT; prose may explain it but never derive or alter it.`,
      [part4.slice(0, 200)],
    ));
  }
  const contradicting = wl.verdict_alternatives
    .map(norm)
    .filter((alt) => alt.toLowerCase() !== verdict && conclusion.includes(alt.toLowerCase()));
  if (contradicting.length > 0) {
    rejections.push(rej(
      "verdict_consistency",
      "conflicting_verdict_stated",
      "Part 4 states a verdict other than the plan's verdict.",
      contradicting,
    ));
  }

  const analysis = doc.parts.find((p) => p.part === 2)?.prose ?? "";
  const firmNegative = /outweigh/i.test(wl.verdict) || /high|critical/i.test(wl.verdict);
  if (firmNegative && !wl.close_outcome) {
    if (COUNT_DRIVEN_RE.test(analysis) && !COUNTERVAILING_RE.test(analysis)) {
      rejections.push(rej(
        "verdict_consistency",
        "count_driven_firm_negative",
        "A firm negative may not be justified by counting categories (§2R.4(3)). Articulate the colorable countervailing considerations and say why they do not carry.",
        [analysis.slice(0, 200)],
      ));
    }
  }

  if (wl.close_outcome && !/reserved to the Company and its counsel/i.test(part4)) {
    rejections.push(rej(
      "verdict_consistency",
      "close_outcome_not_reserved",
      "The plan marks this outcome close/hedged. Close outcomes render hedged and reserved to the Company and its counsel (§2R.4(4)).",
      [part4.slice(0, 200)],
    ));
  }

  return outcome("verdict_consistency", rejections);
}

// ---------------------------------------------------------------------
// (5) SECTION STRUCTURE (§2R.2)
// ---------------------------------------------------------------------

/** §2R.2 registry re-homing map — part number keyed by registry key. */
export const PASS2R_PART_HOME: Readonly<Record<string, 1 | 2 | 3 | 4>> = {
  opening_summary: 1,
  executive_summary: 1,
  assessment_summary: 1,
  scope_and_triggers: 1,
  scope_confirmation: 1,
  processing_narrative: 1,
  risk_assessment_by_activity: 2,
  exception_analysis: 2,
  record_sufficiency: 2,
  information_needed: 3,
  strengthen_items: 3,
  priority_actions: 3,
  next_steps: 3,
  submission_summary: 3,
};

export function validateSectionStructure(
  doc: Pass2rProseDocument,
  wl: Pass2rWhitelist,
): Pass2rValidatorOutcome {
  const rejections: Pass2rRejection[] = [];
  const nums = doc.parts.map((p) => p.part);

  if (nums.length !== 4 || nums.join(",") !== "1,2,3,4") {
    rejections.push(rej(
      "section_structure",
      "four_parts_absent_or_out_of_order",
      "The document is exactly four parts, in order: initial section, required analysis, missing information and next steps, conclusion.",
      [nums.join(",")],
    ));
  }
  const empty = doc.parts.filter((p) => norm(p.prose).length === 0).map((p) => `part_${p.part}`);
  if (empty.length > 0) {
    rejections.push(rej("section_structure", "empty_part", "A part carries no prose.", empty));
  }

  const seen = new Map<string, number[]>();
  for (const p of doc.parts) {
    for (const k of p.covered_keys) {
      seen.set(k, [...(seen.get(k) ?? []), p.part]);
    }
  }
  const orphaned = wl.registry_keys.filter((k) => !seen.has(k));
  if (orphaned.length > 0) {
    rejections.push(rej(
      "section_structure",
      "registry_key_orphaned",
      "A registry key carrying plan content is homed in no part. Coverage — not order — is the invariant (§2R.8(3)).",
      orphaned,
    ));
  }
  const duplicated = [...seen.entries()].filter(([, parts]) => parts.length > 1).map(([k]) => k);
  if (duplicated.length > 0) {
    rejections.push(rej(
      "section_structure",
      "section_cross_duplication",
      "A registry key is covered in more than one part.",
      duplicated,
    ));
  }
  const misplaced = [...seen.entries()]
    .filter(([k, parts]) => PASS2R_PART_HOME[k] !== undefined && parts[0] !== PASS2R_PART_HOME[k])
    .map(([k, parts]) => `${k}:part_${parts[0]}`);
  if (misplaced.length > 0) {
    rejections.push(rej(
      "section_structure",
      "registry_key_wrong_part",
      "A registry key is homed in a part other than the §2R.2 map assigns.",
      misplaced,
    ));
  }

  return outcome("section_structure", rejections);
}

// ---------------------------------------------------------------------
// (6) ATOMIC TOKEN (+ §2R.5 register screen: markdown, truncation, casing)
// ---------------------------------------------------------------------

const METRIC_NAME_RE =
  /\b(?:presence[_ ]rate|factor[_ ]score|closeness|shortfall_keys|review_flag|template[_ ]id|slot[_ ]name|T\.risk\.[a-z0-9_.]+)\b/i;

export function validateAtomicToken(doc: Pass2rProseDocument): Pass2rValidatorOutcome {
  const rejections: Pass2rRejection[] = [];
  const text = proseOf(doc);

  const split = text.match(/\{\{[^}]*$|^[^{]*\}\}|\{\{|\}\}|«|»|\{\s*(?:plan|cite|intake):/g) ?? [];
  if (split.length > 0) {
    rejections.push(rej(
      "atomic_token",
      "split_or_garbled_span",
      "A substituted span is split or garbled (LTP §4.1(6)).",
      split,
    ));
  }

  const markdown = text.match(/\*\*|^#{1,6}\s|`|^\s*[-*\u2022]\s/gm) ?? [];
  if (markdown.length > 0) {
    rejections.push(rej(
      "atomic_token",
      "markdown_literal",
      "Markdown artifacts are banned from customer prose (§2R.5).",
      markdown.map((s) => s.trim()),
    ));
  }

  const truncated = doc.parts
    .filter((p) => norm(p.prose).length > 0 && !/[.!?"'\u201d]$/.test(norm(p.prose)))
    .map((p) => `part_${p.part}:…${norm(p.prose).slice(-40)}`);
  if (truncated.length > 0) {
    rejections.push(rej(
      "atomic_token",
      "not_sentence_boundary",
      "A part does not end on a complete sentence. Hard lengths cut at a sentence boundary, never mid-word (§2R.5).",
      truncated,
    ));
  }

  const casefolded = text.match(/\b[a-z][A-Z]{2,}\b/g) ?? [];
  if (casefolded.length > 0) {
    rejections.push(rej(
      "atomic_token",
      "acronym_case_folded",
      'An acronym has been case-folded ("aDMT"). Restructure the sentence instead (§2R.5).',
      casefolded,
    ));
  }

  const metric = text.match(METRIC_NAME_RE) ?? [];
  if (metric.length > 0) {
    rejections.push(rej(
      "atomic_token",
      "internal_metric_name",
      "Internal metric names, template ids and slot names never appear in customer text (§2R.5).",
      metric,
    ));
  }

  if (/\bFSOR\b|Final Statement of Reasons/i.test(text)) {
    rejections.push(rej(
      "atomic_token",
      "fsor_boilerplate",
      "FSOR / source boilerplate is banned from customer surfaces (§2R.5).",
      ["FSOR"],
    ));
  }

  return outcome("atomic_token", rejections);
}

// ---------------------------------------------------------------------
// (7) NO SELF-CONTRADICTION (LTP §4.1(7))
// ---------------------------------------------------------------------

const ASK_VERB_RE = /\b(?:provide|obtain|identify|supply|specify|state|record|document|confirm)\b/i;

export function validateNoSelfContradiction(
  doc: Pass2rProseDocument,
  wl: Pass2rWhitelist,
): Pass2rValidatorOutcome {
  const part3 = doc.parts.find((p) => p.part === 3)?.prose ?? "";
  const sentences = part3.split(/(?<=[.!?])\s+/).map(norm).filter(Boolean);
  const facts = wl.stated_facts.map(norm).filter((f) => f.length >= 8);
  const bad: string[] = [];

  for (const s of sentences) {
    if (!ASK_VERB_RE.test(s)) continue;
    for (const f of facts) {
      if (s.includes(f) && !bad.includes(s)) bad.push(s);
    }
  }

  return outcome(
    "no_self_contradiction",
    bad.length === 0 ? [] : [rej(
      "no_self_contradiction",
      "part3_requests_stated_fact",
      "Part 3 asks for information the document already states. Ask only for what the record does not carry.",
      bad,
    )],
  );
}

// ---------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------

export function runPass2rValidators(
  doc: Pass2rProseDocument,
  wl: Pass2rWhitelist,
  opts: { mode?: Pass2rValidatorMode } = {},
): Pass2rValidationResult {
  const mode: Pass2rValidatorMode = opts.mode ?? PASS2R_DEFAULT_MODE;
  const outcomes: Pass2rValidatorOutcome[] = [
    validateCitationWhitelist(doc, wl),
    validateNumericDateWhitelist(doc, wl),
    validateEntityWhitelist(doc, wl),
    validateVerdictConsistency(doc, wl),
    validateSectionStructure(doc, wl),
    validateAtomicToken(doc),
    validateNoSelfContradiction(doc, wl),
  ];
  const rejections = outcomes.flatMap((o) => o.rejections);
  const reject_reason = rejections
    .map((r) => `[${r.validator}/${r.code}] ${r.detail} Evidence: ${JSON.stringify(r.evidence)}`)
    .join("\n");

  return {
    version: PASS2R_VALIDATORS_VERSION,
    mode,
    ok: rejections.length === 0,
    // OBSERVE-FIRST: in observe mode the result can never affect shipped output.
    effective: mode === "enforce",
    outcomes,
    rejections,
    reject_reason,
  };
}

// ---------------------------------------------------------------------
// Whitelist construction from the LOCKED plan
// ---------------------------------------------------------------------

const VERDICT_ENUM: readonly string[] = [
  "Low",
  "Moderate",
  "High",
  "Critical",
  "Insufficient basis",
];

function displayStrings(plan: RenderPlan): string[] {
  return plan.intake_ledger
    .map((l) => String(l.display ?? l.value ?? ""))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildPass2rWhitelist(
  plan: RenderPlan,
  opts: {
    verdict: string;
    close_outcome?: boolean;
    registry_keys?: readonly string[];
    deadline_literals?: readonly string[];
  },
): Pass2rWhitelist {
  const displays = displayStrings(plan);
  const numerics = [
    ...displays,
    ...plan.factor_table.map((f) => String(f.weight_note ?? "")),
    ...plan.citation_bindings.map((c) => c.pinpoint),
    ...(opts.deadline_literals ?? []),
  ].filter(Boolean);

  const entities = [
    ...displays,
    ...plan.factor_table.map((f) => String(f.display_label ?? "")),
    ...plan.propositions.map((p) => String(p.display_label ?? "")),
  ].filter(Boolean);

  return {
    citations: plan.citation_bindings.map((c) => c.pinpoint),
    numerics,
    entities,
    verdict: opts.verdict,
    verdict_alternatives: VERDICT_ENUM.filter((v) => v !== opts.verdict),
    close_outcome: opts.close_outcome === true,
    registry_keys: opts.registry_keys ?? [],
    stated_facts: displays,
  };
}
