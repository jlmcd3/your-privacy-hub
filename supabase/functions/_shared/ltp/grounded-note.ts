/**
 * ITEM 242 CP-C RIDER (2026-07-28) — THE GROUNDED-NOTE LAW.
 *
 * Zero-hallucination by construction: every content-bearing token in a
 * factor `weight_note` MUST originate from one of three closed sources:
 *   (i)  the plan's intake-ledger verbatims (display + stringified value),
 *   (ii) the registry vocabulary (factor/proposition display labels,
 *        factor-kind terms, gate/law shorthand),
 *   (iii) the closed CONNECTIVE LEXICON below (curated analytic vocab
 *         — record verbs, neutral analytic terms, hedges, function words).
 *
 * Violating notes are DETERMINISTICALLY REPLACED — never model-mediated —
 * with the grounded form:
 *     the intake records "{ledger_verbatim}" for {field_display_label}
 * or the standard "no record evidence" when no ledger row supports the row.
 *
 * NORMALIZATION SPEC (test-asserted; positive AND negative fixtures):
 *   • case-fold (lowercase);
 *   • strip punctuation to word boundaries; keep intra-token hyphens and
 *     apostrophes;
 *   • inflection tolerance: token, token±s, token±es, token±ing, token±ed,
 *     and y↔ies (no stemming beyond these rules);
 *   • numerals: a numeric token is grounded iff the exact numeral string
 *     (post case-fold) appears as a substring of any ledger verbatim; no
 *     rounding, no unit rewriting;
 *   • quotation marks (", ", ", ', ', ') are treated as connective
 *     punctuation and never as content tokens — this is how ledger
 *     verbatims render "as marked quotations" per panel condition (2).
 *
 * TELEMETRY (panel condition 4): per-plan `grounded_note_replacements`
 * count + `grounded_note_replacement_rate` (over factor_table rows that
 * carried a non-empty weight_note pre-screen). Tuning threshold: a
 * batch-level rate > 25% flags the lexicon as too narrow — the CEO reviews
 * the data, we do not silently widen the lexicon.
 *
 * The check constrains EXPRESSION ONLY (panel condition 5); it does not
 * touch present_in_intake / intake_ledger_refs / guidance_refs / anchor.
 */

import type { FactorTableEntry, IntakeLedgerEntry, RenderPlan } from "../render-plan/schema.ts";
import { CPPA_RISK_FACTORS } from "../factors/cppa-risk-factors.ts";
import { CPPA_RISK_CONCLUSIONS } from "../legal-test/cppa-risk-conclusions.ts";

export const PASS1_GROUNDED_NOTE_VERSION =
  "pass1-grounded-note@2026-07-28-item242-bc-rider";

/**
 * CONNECTIVE LEXICON — closed, curated analytic vocabulary. Verbatim
 * mirror of §5 of docs/courier/ITEM242-BC-WIRED-2026-07-28.md. Any
 * addition/removal is a courier turn.
 */
export const CONNECTIVE_LEXICON: readonly string[] = [
  // record verbs (what the intake DOES relative to the record)
  "states", "state", "stated", "record", "records", "recorded",
  "documents", "documented", "identifies", "identified",
  "reports", "reported", "describes", "described", "lists", "listed",
  "names", "named", "notes", "noted", "confirms", "confirmed",
  "provides", "provided", "indicates", "indicated", "shows", "showed",
  "supplies", "supplied", "attests", "attested",
  // neutral analytic terms (what the RECORD is or is not)
  "present", "absent", "silent", "unaddressed", "unclear",
  "documented", "undocumented", "unstated", "missing",
  "sufficient", "insufficient", "adequate", "inadequate",
  "specific", "general", "generic", "particular",
  "applicable", "inapplicable", "engaged", "not-engaged",
  // absence phrasings (also stated as fixed multi-word forms below)
  "does", "not", "no", "none", "without", "lacks", "lacked",
  "is", "are", "was", "were", "be", "been", "being",
  "has", "have", "had", "carries", "carried",
  // hedging function words
  "may", "might", "could", "would", "should", "likely", "unlikely",
  "appears", "appear", "seems", "seem", "suggests", "suggested",
  // quantity function words (numerals themselves are grounded via ledger)
  "one", "two", "three", "several", "multiple", "few", "many", "any",
  "all", "each", "every", "single", "additional",
  // scope function words
  "for", "the", "a", "an", "of", "in", "on", "at", "by", "to", "from",
  "with", "within", "under", "over", "per", "as", "and", "or", "but",
  "than", "then", "that", "this", "these", "those", "such", "which",
  "when", "where", "while", "because", "since", "if", "unless", "only",
  // register connectives (the fixed frames the replacement uses)
  "purpose", "stated-purpose", "for-the-stated-purpose-of",
  // canonical field labels used as analytic terms
  "record", "records", "intake", "assessment",
];

/** Registry vocabulary — display labels + fixed factor/gate/law shorthand. */
const REGISTRY_VOCAB_TOKENS: readonly string[] = (() => {
  const bag: string[] = [];
  for (const f of CPPA_RISK_FACTORS) {
    if ((f as unknown as { display_label?: string }).display_label) {
      bag.push(String((f as unknown as { display_label?: string }).display_label));
    }
    bag.push(f.id);
    if (f.kind) bag.push(f.kind);
  }
  for (const c of CPPA_RISK_CONCLUSIONS) {
    if (c.display_label) bag.push(c.display_label);
    bag.push(c.id);
  }
  // Fixed law/register shorthand admissible in notes as vocabulary.
  bag.push(
    "cppa", "ccpa", "regulation", "regulations",
    "processing", "consumer", "consumers", "business",
    "personal", "information", "sensitive",
    "risk", "assessment", "safeguard", "safeguards",
    "benefit", "benefits", "harm", "harms", "impact", "impacts",
    "consultation", "external", "internal", "contributor", "contributors",
    "training", "admt", "automated", "decisionmaking",
    "retention", "purpose", "purposes", "category", "categories",
    "financial", "employment", "geolocation", "biometric",
  );
  return bag;
})();

// ────────────────────────────────────────────────────────────────────────
// Normalization
// ────────────────────────────────────────────────────────────────────────

const QUOTE_CHARS = /[\u201C\u201D\u201E\u2033\u2036\u2018\u2019\u201A\u2032"'`]/g;

/** Split arbitrary text into normalized content-bearing tokens. */
export function tokenize(text: string): string[] {
  if (!text) return [];
  // Case-fold and strip quotes (treated as connective punctuation).
  const folded = text.toLowerCase().replace(QUOTE_CHARS, " ");
  // Keep letters, digits, intra-word hyphens/apostrophes; everything else is a boundary.
  const raw = folded.split(/[^a-z0-9\-']+/g).map((s) => s.replace(/^[-']+|[-']+$/g, ""));
  return raw.filter((t) => t.length >= 1);
}

/** Content-bearing predicate — everything except pure punctuation. */
function isContentToken(t: string): boolean {
  return t.length > 0 && /[a-z0-9]/.test(t);
}

/** Generate the inflection variants that count as "the same token" for grounding. */
function inflections(t: string): string[] {
  const set = new Set<string>([t]);
  // pluralization
  if (t.endsWith("ies") && t.length > 3) set.add(t.slice(0, -3) + "y");
  if (t.endsWith("y") && t.length > 1) set.add(t.slice(0, -1) + "ies");
  if (t.endsWith("es") && t.length > 2) set.add(t.slice(0, -2));
  if (t.endsWith("s") && t.length > 1) set.add(t.slice(0, -1));
  set.add(t + "s");
  set.add(t + "es");
  // verb forms
  if (t.endsWith("ing") && t.length > 4) set.add(t.slice(0, -3));
  if (t.endsWith("ed") && t.length > 3) set.add(t.slice(0, -2));
  set.add(t + "ing");
  set.add(t + "ed");
  return [...set];
}

// ────────────────────────────────────────────────────────────────────────
// Grounded set builder
// ────────────────────────────────────────────────────────────────────────

export interface GroundedSet {
  /** All non-numeric grounded tokens (post case-fold), inflection-expanded. */
  readonly tokens: ReadonlySet<string>;
  /** Substrings of ledger verbatims used to ground numerals. */
  readonly numeralSources: readonly string[];
}

function ledgerVerbatimStrings(ledger: readonly IntakeLedgerEntry[]): string[] {
  const out: string[] = [];
  for (const l of ledger) {
    if (l.display) out.push(String(l.display));
    if (l.value !== null && l.value !== undefined) out.push(String(l.value));
  }
  return out;
}

export function buildGroundedSet(ledger: readonly IntakeLedgerEntry[]): GroundedSet {
  const tokens = new Set<string>();
  const numeralSources: string[] = [];
  const feed = (text: string) => {
    for (const raw of tokenize(text)) {
      if (!isContentToken(raw)) continue;
      // Numerals are grounded through numeralSources — not here.
      if (/^\d/.test(raw)) continue;
      for (const v of inflections(raw)) tokens.add(v);
    }
  };
  for (const t of CONNECTIVE_LEXICON) feed(t);
  for (const t of REGISTRY_VOCAB_TOKENS) feed(t);
  for (const v of ledgerVerbatimStrings(ledger)) {
    feed(v);
    numeralSources.push(v.toLowerCase());
  }
  return { tokens, numeralSources };
}

/** Is a single normalized token grounded against the set? */
export function isGrounded(token: string, set: GroundedSet): boolean {
  if (!isContentToken(token)) return true;
  if (/^\d/.test(token)) {
    // numeral: any exact substring hit in any ledger verbatim
    return set.numeralSources.some((s) => s.includes(token));
  }
  return set.tokens.has(token);
}

// ────────────────────────────────────────────────────────────────────────
// Screen + deterministic replacement
// ────────────────────────────────────────────────────────────────────────

export interface GroundedNoteReplacement {
  readonly factor_id: string;
  readonly reason: "ungrounded_token";
  readonly ungrounded_tokens: readonly string[];  // up to 5 for evidence
  readonly original_note: string;                 // ≤200 chars
  readonly replacement_note: string;
  readonly ledger_ref?: string;                   // ledger_id used for the grounded form, if any
}

export interface GroundedNoteTelemetry {
  readonly version: string;
  readonly candidates: number;              // rows with non-empty weight_note pre-screen
  readonly replacements: number;
  readonly replacement_rate: number;        // 0..1
  readonly tuning_threshold_rate: number;   // 0.25 per panel condition 4
  readonly over_threshold: boolean;
  readonly details: readonly GroundedNoteReplacement[];
}

function pickDrivingLedger(
  row: FactorTableEntry,
  ledger: readonly IntakeLedgerEntry[],
): IntakeLedgerEntry | undefined {
  const refs = row.intake_ledger_refs ?? [];
  if (refs.length > 0) {
    const byId = new Map(ledger.map((l) => [l.ledger_id, l] as const));
    for (const r of refs) {
      const hit = byId.get(r);
      if (hit && hit.value !== null && hit.value !== "" && hit.value !== undefined) return hit;
    }
  }
  // fallback: first ledger row with a non-empty value
  for (const l of ledger) {
    if (l.value !== null && l.value !== "" && l.value !== undefined) return l;
  }
  return undefined;
}

function buildGroundedForm(driver: IntakeLedgerEntry | undefined): { note: string; ledger_ref?: string } {
  if (!driver) return { note: "no record evidence" };
  const value = String(driver.value ?? "").trim();
  const label = String(driver.display ?? driver.intake_field ?? "").trim();
  if (!value) return { note: "no record evidence" };
  if (!label) return { note: `the intake records "${value}"`, ledger_ref: driver.ledger_id };
  return { note: `the intake records "${value}" for ${label}`, ledger_ref: driver.ledger_id };
}

const TUNING_THRESHOLD_RATE = 0.25;

/** Screen the full plan; returns a new plan + telemetry. Pure, never throws. */
export function applyGroundedNoteScreen(
  plan: RenderPlan,
): { plan: RenderPlan; telemetry: GroundedNoteTelemetry } {
  const set = buildGroundedSet(plan.intake_ledger ?? []);
  const details: GroundedNoteReplacement[] = [];
  let candidates = 0;
  const out: FactorTableEntry[] = (plan.factor_table ?? []).map((row) => {
    const note = (row.weight_note ?? "").toString();
    if (!note) return row;
    candidates++;
    const tokens = tokenize(note).filter(isContentToken);
    const ungrounded: string[] = [];
    for (const t of tokens) {
      if (!isGrounded(t, set)) {
        ungrounded.push(t);
        if (ungrounded.length >= 5) break;
      }
    }
    if (ungrounded.length === 0) return row;
    const driver = pickDrivingLedger(row, plan.intake_ledger ?? []);
    const { note: replacement, ledger_ref } = buildGroundedForm(driver);
    details.push({
      factor_id: row.factor_id,
      reason: "ungrounded_token",
      ungrounded_tokens: ungrounded,
      original_note: note.slice(0, 200),
      replacement_note: replacement,
      ...(ledger_ref ? { ledger_ref } : {}),
    });
    return { ...row, weight_note: replacement } as FactorTableEntry;
  });
  const replacements = details.length;
  const replacement_rate = candidates === 0 ? 0 : replacements / candidates;
  const telemetry: GroundedNoteTelemetry = {
    version: PASS1_GROUNDED_NOTE_VERSION,
    candidates,
    replacements,
    replacement_rate,
    tuning_threshold_rate: TUNING_THRESHOLD_RATE,
    over_threshold: replacement_rate > TUNING_THRESHOLD_RATE,
    details,
  };
  return { plan: { ...plan, factor_table: out }, telemetry };
}
